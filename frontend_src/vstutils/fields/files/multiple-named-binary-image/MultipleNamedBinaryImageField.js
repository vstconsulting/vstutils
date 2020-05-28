import MultipleNamedBinaryImageFieldMixin from './MultipleNamedBinaryImageFieldMixin.js';
import { MultipleNamedBinaryFileField } from '../multiple-named-binary-file';

/**
 * MultipleNamedBinFile guiField class.
 * This field takes and returns array with objects, consisting of 2 properties:
 * - name - string - name of file;
 * - content - base64 string - content of file.
 */
class MultipleNamedBinaryImageField extends MultipleNamedBinaryFileField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(MultipleNamedBinaryImageFieldMixin);
    }
}

export default MultipleNamedBinaryImageField;
