import type { FieldOptions } from '@/vstutils/fields/base';
import { BaseField } from '@/vstutils/fields/base';
import { pop_up_msg } from '@/vstutils/popUp';
import { i18n } from '@/vstutils/translation';

import { parseAllowedMediaTypes } from '../file';
import NamedBinaryFileFieldMixin from './NamedBinaryFileFieldMixin';

import type { FileFieldXOptions, IFileField } from '../file';
import type { NamedFile } from './utils';
import { ensureMediaTypeExists } from './utils';

/**
 * This field takes and returns JSON with 3 properties:
 * - name - string - name of file;
 * - mediaType - string - MIME type of file
 * - content - base64 string - content of file.
 */
export class NamedBinaryFileField
    extends BaseField<NamedFile, NamedFile, FileFieldXOptions | undefined>
    implements IFileField
{
    maxSize?: number;
    allowedMediaTypes?: string[];

    constructor(options: FieldOptions<FileFieldXOptions | undefined, NamedFile>) {
        super(options);

        this.maxSize = this.props?.max_size;
        this.allowedMediaTypes = parseAllowedMediaTypes(options);
    }

    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return [NamedBinaryFileFieldMixin];
    }
    /**
     * Redefinition of 'validateValue' method of binfile guiField.
     */
    validateValue(data: Record<string, unknown> = {}) {
        const value = super.validateValue(data);

        if (value && this.required && value.name === null && value.content === null) {
            throw {
                error: 'validation',
                message: i18n.t(pop_up_msg.field.error.empty) as string,
            };
        }

        return value;
    }

    toRepresent(data: Record<string, unknown>) {
        return ensureMediaTypeExists(this.getDataInnerValue(data));
    }

    getEmptyValue() {
        return null;
    }
}

export default NamedBinaryFileField;
