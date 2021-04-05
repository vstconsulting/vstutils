import { NamedBinaryFileField } from '../named-binary-file';
import NamedBinaryImageFieldMixin from './NamedBinaryImageFieldMixin.js';
import ResolutionValidatorConfig from './ResolutionValidatorConfig.js';

/**
 * NamedBinImage guiField class.
 * This field takes and returns JSON with 2 properties:
 * - name - string - name of image;
 * - mediaType - string - MIME type of file;
 * - content - base64 string - content of image.
 */
class NamedBinaryImageField extends NamedBinaryFileField {
    constructor(options) {
        super(options);
        this.resolutionConfig = ResolutionValidatorConfig.createIfNeeded(options);
    }

    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(NamedBinaryImageFieldMixin);
    }
}

export default NamedBinaryImageField;
