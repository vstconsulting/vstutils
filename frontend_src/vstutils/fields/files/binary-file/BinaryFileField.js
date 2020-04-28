import { arrayBufferToBase64 } from '../../../utils';
import { FileField } from '../file';
import BinaryFileFieldMixin from './BinaryFileFieldMixin.js';

/**
 * BinFile guiField class.
 * Field takes file's content, converts it into base64 string and sends this string to API.
 */
class BinaryFileField extends FileField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(BinaryFileFieldMixin);
    }

    /**
     * Method, that converts field's value to base64.
     * It's supposed that value of current field is an instance of ArrayBuffer.
     * @param {object} data Object with values of current field
     * and fields from the same fields wrapper.
     * For example, from the same Model Instance.
     */
    toBase64(data = {}) {
        let value = data[this.options.name];

        if (value !== undefined) {
            return arrayBufferToBase64(value);
        }
    }
}

export default BinaryFileField;
