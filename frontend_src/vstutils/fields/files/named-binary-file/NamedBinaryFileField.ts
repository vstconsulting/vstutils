import type { FieldOptions } from '@/vstutils/fields/base';
import { BaseField } from '@/vstutils/fields/base';
import { pop_up_msg } from '@/vstutils/popUp';
import { i18n } from '@/vstutils/translation';

import { parseAllowedMediaTypes } from '../file';
import NamedBinaryFileFieldMixin from './NamedBinaryFileFieldMixin';

import type { FileFieldXOptions, IFileField } from '../file';
import type { NamedFile } from './utils';
import { ensureMediaTypeExists, validateNamedFileJson } from './utils';
import type { InnerData, RepresentData } from '@/vstutils/utils';

/**
 * This field takes and returns JSON with 3 properties:
 * - name - string - name of file;
 * - mediaType - string - MIME type of file
 * - content - base64 string - content of file.
 */
export class NamedBinaryFileField<XOptions extends FileFieldXOptions = FileFieldXOptions>
    extends BaseField<NamedFile, NamedFile, XOptions>
    implements IFileField
{
    allowedMediaTypes: string[] | undefined;

    constructor(options: FieldOptions<XOptions, NamedFile>) {
        super(options);

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
    validateValue(data: RepresentData) {
        const value = super.validateValue(data);

        if (value) {
            validateNamedFileJson(this, value);
        }

        if (value && this.required && value.name === null && value.content === null) {
            throw {
                error: 'validation',
                message: i18n.ts(pop_up_msg.field.error.empty),
            };
        }

        return value;
    }

    toRepresent(data: InnerData) {
        return ensureMediaTypeExists(this.getValue(data));
    }

    getEmptyValue() {
        return null;
    }
}

export default NamedBinaryFileField;
