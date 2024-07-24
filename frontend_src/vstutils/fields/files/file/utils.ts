import { i18n } from '#vstutils/translation';
import type { Field } from '#vstutils/fields/base';

export interface IFileField extends Field {
    allowedMediaTypes: string[] | undefined;
}

export const fileIsTooLarge = (name?: string | null) =>
    i18n.ts('File{fileName} is too large', { fileName: name ? ` "${name}"` : '' });

export const fileIsTooSmall = (name?: string | null) =>
    i18n.ts('File{fileName} is too small', { fileName: name ? ` "${name}"` : '' });

/**
 * Validates maxLength and minLength of simple string file
 */
export function validateSimpleFileLength(field: Field, value: string) {
    if (field.options.maxLength !== undefined && value.length > field.options.maxLength) {
        throw new Error(
            `${fileIsTooLarge()}, ${i18n.ts('Max length: {0}', [field.options.maxLength]).toLowerCase()}`,
        );
    }
    if (field.options.minLength !== undefined && value.length < field.options.minLength) {
        throw new Error(
            `${fileIsTooSmall()}, ${i18n.ts('Min length: {0}', [field.options.minLength]).toLowerCase()}`,
        );
    }
}
