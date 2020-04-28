import { _translate } from '../../../utils';
import { pop_up_msg } from '../../../popUp';
import { BinaryFileField } from '../binary-file';
import NamedBinaryFileFieldMixin from './NamedBinaryFileFieldMixin.js';

/**
 * NamedBinFile guiField class.
 * This field takes and returns JSON with 2 properties:
 * - name - string - name of file;
 * - content - base64 string - content of file.
 */
class NamedBinaryFileField extends BinaryFileField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(NamedBinaryFileFieldMixin);
    }
    /**
     * Redefinition of 'validateValue' method of binfile guiField.
     */
    validateValue(data = {}) {
        let value = super.validateValue(data);

        if (value && this.options.required && value.name === null && value.content === null) {
            let title = (this.options.title || this.options.name).toLowerCase();
            let $t = _translate;

            throw {
                error: 'validation',
                message: $t(pop_up_msg.field.error.empty).format($t(title)),
            };
        }

        return value;
    }
}

export default NamedBinaryFileField;
