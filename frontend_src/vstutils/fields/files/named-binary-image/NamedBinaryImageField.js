import { NamedBinaryFileField } from '../named-binary-file';
import NamedBinaryImageFieldMixin from './NamedBinaryImageFieldMixin.js';

/**
 * NamedBinImage guiField class.
 * This field takes and returns JSON with 2 properties:
 * - name - string - name of image;
 * - content - base64 string - content of image.
 */
class NamedBinaryImageField extends NamedBinaryFileField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(NamedBinaryImageFieldMixin);
    }
}

export default NamedBinaryImageField;
