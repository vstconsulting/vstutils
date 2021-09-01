import { loadImage, makeDataImageUrl, readFileAsObject } from '../../../utils';
import { guiPopUp } from '../../../popUp';

/**
 * @vue/component
 */
export default {
    data: () => ({
        imagesForValidation: null,
    }),
    methods: {
        async readFiles(files) {
            const results = [];

            for (let index = 0; index < files.length; index++) {
                const file = files[index];
                if (!file || !this.$parent.validateFileSize(file.size)) {
                    return;
                }
                results.push(await readFileAsObject(file));
            }
            // split extensions list and remove leading dot
            const extensions = this.$parent.field.extensions?.split(',').map((e) => e.slice(1));
            if (extensions) {
                for (const { mediaType, name } of results) {
                    const type = mediaType.split('/')[1];
                    if (!extensions.includes(type)) {
                        guiPopUp.error(this.$t('This file format is not supported') + ': ' + name);
                        return;
                    }
                }
            }

            if (this.field.resolutionConfig) {
                for (const { content, mediaType, name } of results) {
                    let img = null;
                    try {
                        img = await loadImage(makeDataImageUrl({ content, mediaType }));
                        // eslint-disable-next-line no-empty
                    } catch (e) {}

                    const errors = [];
                    if (img) {
                        if (img.naturalHeight < this.field.resolutionConfig.minHeight)
                            errors.push(
                                `Height should be more then ${this.field.resolutionConfig.minHeight}px.`,
                            );
                        if (img.naturalWidth < this.field.resolutionConfig.minWidth)
                            errors.push(
                                `Width should be more then ${this.field.resolutionConfig.minWidth}px.`,
                            );
                    } else {
                        errors.push(this.$t('Invalid file {0}', [name]));
                    }
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
            this.$emit('set-value', [...(this.value || []), ...validatedImages]);
            this.cancelValidation();
        },
    },
};
