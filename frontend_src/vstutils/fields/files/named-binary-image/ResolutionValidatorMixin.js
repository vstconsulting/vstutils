import { arrayBufferToBase64, loadImage, readFileAsArrayBuffer } from '../../../utils';
import { guiPopUp } from '../../../popUp';

/**
 * @vue/component
 */
export default {
    data: () => ({
        imagesForValidation: null,
    }),
    methods: {
        async readFiles(event) {
            const files = event.target.files;

            const results = [];

            for (let index = 0; index < files.length; index++) {
                const file = files[index];
                if (!file || !this.$parent.validateFileSize(file.size)) {
                    return;
                }
                results.push({
                    name: file.name || null,
                    content: arrayBufferToBase64(await readFileAsArrayBuffer(file)),
                });
            }

            event.target.value = '';

            if (this.field.resolutionConfig) {
                for (const { content } of results) {
                    const img = await loadImage('data:image/png;base64,' + content);
                    const errors = [];
                    if (img.naturalHeight < this.field.resolutionConfig.minHeight)
                        errors.push(`Height should be more then ${this.field.resolutionConfig.minHeight}px.`);
                    if (img.naturalWidth < this.field.resolutionConfig.minWidth)
                        errors.push(`Width should be more then ${this.field.resolutionConfig.minWidth}px.`);
                    if (errors.length) {
                        guiPopUp.error(errors.join('<br/>'));
                        return;
                    }
                }
                this.imagesForValidation = results;
            } else {
                this.onImageValidated(results);
            }
        },
        cancelValidation() {
            this.imagesForValidation = null;
        },
        onImageValidated(validatedImages) {
            this.$emit('set-value', [...this.value, ...validatedImages]);
            this.cancelValidation();
        },
    },
};
