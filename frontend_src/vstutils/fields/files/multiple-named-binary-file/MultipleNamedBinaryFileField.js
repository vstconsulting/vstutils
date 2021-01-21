import { _translate } from '../../../utils';
import { pop_up_msg } from '../../../popUp';
import { NamedBinaryFileField } from '../named-binary-file';
import MultipleNamedBinaryFileFieldMixin from './MultipleNamedBinaryFileFieldMixin.js';

/**
 * MultipleNamedBinFile guiField class.
 * This field takes and returns array with objects, consisting of 2 properties:
 * - name - string - name of file;
 * - content - base64 string - content of file.
 */
class MultipleNamedBinFileField extends NamedBinaryFileField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(MultipleNamedBinaryFileFieldMixin);
    }

    getInitialValue() {
        return [];
    }

    /**
     * Redefinition of 'validateValue' method of binfile guiField.
     */
    validateValue(data = {}) {
        let value = super.validateValue(data);

        if (value && this.options.required && Array.isArray(value) && value.length === 0) {
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

export default MultipleNamedBinFileField;
