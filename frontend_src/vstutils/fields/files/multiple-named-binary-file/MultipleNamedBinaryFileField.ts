import { BaseField } from '@/vstutils/fields/base';
import { pop_up_msg } from '@/vstutils/popUp';
import { i18n } from '@/vstutils/translation';

import MultipleNamedBinaryFileFieldMixin from './MultipleNamedBinaryFileFieldMixin';

import type { ComponentOptions } from 'vue';
import type { FieldOptions } from '@/vstutils/fields/base';
import type { NamedFile } from '../named-binary-file';
import { ensureMediaTypeExists } from '../named-binary-file';
import type { FileFieldXOptions, IFileField } from '../file';
import { parseAllowedMediaTypes } from '../file';
import type { InnerData } from '@/vstutils/utils';

class MultipleNamedBinaryFileField
    extends BaseField<NamedFile[] | string, NamedFile[], FileFieldXOptions | undefined>
    implements IFileField
{
    allowedMediaTypes: string[] | undefined;

    constructor(options: FieldOptions<FileFieldXOptions | undefined, NamedFile[]>) {
        Object.assign(options, options.items);
        delete options.items;
        super(options);

        this.allowedMediaTypes = parseAllowedMediaTypes(options);
    }

    static get mixins() {
        return [MultipleNamedBinaryFileFieldMixin as ComponentOptions<Vue>];
    }

    getInitialValue() {
        const value = super.getInitialValue();
        if (value === undefined) {
            return this.getEmptyValue();
        }
        return value;
    }

    getEmptyValue() {
        return [];
    }

    /**
     * Redefinition of 'validateValue' method of binfile guiField.
     */
    validateValue(data = {}) {
        const value = super.validateValue(data);

        if (value && this.options.required && Array.isArray(value) && value.length === 0) {
            const title = (this.options.title || this.options.name).toLowerCase();

            throw {
                error: 'validation',
                message: i18n.ts(pop_up_msg.field.error.empty).format(i18n.ts(title)),
            };
        }

        return value;
    }

    toRepresent(data: InnerData) {
        let value = this.getValue(data);
        if (typeof value === 'string') {
            value = JSON.parse(value) as NamedFile[];
        }
        if (Array.isArray(value)) {
            return value.map((file) => ensureMediaTypeExists(file));
        }
        return value;
    }
}

export default MultipleNamedBinaryFileField;
