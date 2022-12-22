import { FileField } from '@/vstutils/fields/files/file';
import BinaryFileFieldMixin from './BinaryFileFieldMixin';
import type { ComponentOptions } from 'vue';

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
}

export default BinaryFileField;
