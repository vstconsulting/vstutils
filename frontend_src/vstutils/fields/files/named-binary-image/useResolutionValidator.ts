import { ref } from 'vue';

import { guiPopUp } from '#vstutils/popUp';
import { i18n } from '#vstutils/translation';
import { loadImage, makeDataImageUrl, readFileAsObject } from '#vstutils/utils';
import { validateNamedFilesContentSize } from '../named-binary-file';

import type { NamedFile } from '../named-binary-file';
import type { IImageField } from './NamedBinaryImageField';

export function useResolutionValidator(
    field: IImageField,
    onImagesValidated: (validatedImages: NamedFile[]) => void,
) {
    const imagesForValidation = ref<NamedFile[] | null>(null);

    function cancelValidation() {
        imagesForValidation.value = null;
    }

    async function readFiles(files: FileList | File[]) {
        const results: NamedFile[] = [];
        for (const file of files) {
            results.push(await readFileAsObject(file));
        }
        if (!validateNamedFilesContentSize(field, results)) {
            return;
        }
        const allowedMediaTypes = field.allowedMediaTypes;
        if (allowedMediaTypes && allowedMediaTypes.length > 0) {
            for (const { mediaType, name } of results) {
                if (!allowedMediaTypes.includes(mediaType!)) {
                    guiPopUp.error(`${i18n.t('This file format is not supported') as string}: ${name ?? ''}`);
                    return;
                }
            }
        }

        if (field.resolutionConfig) {
            for (const { content, mediaType, name } of results) {
                let img = null;
                try {
                    img = await loadImage(makeDataImageUrl({ content, mediaType }));
                    // eslint-disable-next-line no-empty
                } catch (e) {}

                const errors = [];
                if (!img) {
                    errors.push(i18n.t('Invalid file {0}', [name]));
                }
                if (errors.length) {
                    guiPopUp.error(errors.join('<br/>'));
                    return;
                }
            }
            imagesForValidation.value = results;
        } else {
            onImagesValidated(results);
        }
    }

    return {
        imagesForValidation,
        cancelValidation,
        readFiles,
    };
}
