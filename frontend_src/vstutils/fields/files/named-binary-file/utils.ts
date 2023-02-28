import { computed } from 'vue';
import { i18n } from '@/vstutils/translation';
import { guiPopUp } from '@/vstutils/popUp';
import type { Ref } from 'vue';
import type { Field } from '@/vstutils/fields/base';
import { fileIsTooLarge, fileIsTooSmall } from '../file';

export interface NamedFile {
    name?: string | null;
    mediaType?: string | null;
    content: string;
}

export function useNamedFileText(file: Ref<NamedFile | undefined | null>) {
    return computed(() => {
        if (file.value?.content) {
            return file.value.name || i18n.tc('file n selected', 1);
        }
        return '';
    });
}

export function ensureMediaTypeExists<T = NamedFile | null | undefined>(value: T): T {
    if (value && typeof value === 'object' && !('mediaType' in value)) {
        value = { ...value, mediaType: null };
    }
    return value;
}

export function useFileNameValidator(field: Ref<Field>) {
    const minLength = computed(
        () => field.value.options.properties?.name?.minLength ?? Number.NEGATIVE_INFINITY,
    );
    const maxLength = computed(
        () => field.value.options.properties?.name?.maxLength ?? Number.POSITIVE_INFINITY,
    );

    function validate(file: File) {
        if (file.name.length > maxLength.value || file.name.length < minLength.value) {
            return false;
        }
        return true;
    }

    return {
        validate,
        minLength,
        maxLength,
    };
}

export function validateNamedFilesContentSize(field: Field, files: NamedFile[]) {
    const minLength = field.options.properties?.content?.minLength;
    const maxLength = field.options.properties?.content?.maxLength;
    let ok = true;

    if (minLength !== undefined) {
        for (const file of files) {
            if (file.content.length < minLength) {
                guiPopUp.error(fileIsTooLarge(file.name));
                ok = false;
            }
        }
    }

    if (maxLength !== undefined) {
        for (const file of files) {
            if (file.content.length > maxLength) {
                guiPopUp.error(fileIsTooSmall(file.name));
                ok = false;
            }
        }
    }

    return ok;
}

export function validateNamedFileJson(field: Field, file: NamedFile) {
    const minLength = field.options.minLength;
    const maxLength = field.options.maxLength;

    if (minLength !== undefined || maxLength !== undefined) {
        const str = JSON.stringify(file);
        if (minLength !== undefined && str.length < minLength) {
            throw new Error(fileIsTooSmall(file.name));
        }
        if (maxLength !== undefined && str.length > maxLength) {
            throw new Error(fileIsTooLarge(file.name));
        }
    }
}
