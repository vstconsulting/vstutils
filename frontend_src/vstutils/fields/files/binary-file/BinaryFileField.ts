import { FileField, fileIsTooLarge, fileIsTooSmall } from '@/vstutils/fields/files/file';
import BinaryFileFieldMixin from './BinaryFileFieldMixin';

import type { ComponentOptions } from 'vue';
import type { RepresentData } from '@/vstutils/utils';

/**
 * BinFile guiField class.
 * Field takes file's content, converts it into base64 string and sends this string to API.
 */
class BinaryFileField extends FileField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return [BinaryFileFieldMixin as ComponentOptions<Vue>];
    }

    validateValue(data: RepresentData): string | null | undefined {
        const value = this.getValue(data);

        if (value) {
            if (this.options.maxLength !== undefined && value.length > this.options.maxLength) {
                throw new Error(fileIsTooLarge());
            }

            if (this.options.minLength !== undefined && value.length < this.options.minLength) {
                throw new Error(fileIsTooSmall());
            }
        }

        return super.validateValue(data);
    }
}

export default BinaryFileField;
