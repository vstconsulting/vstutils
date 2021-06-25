import MultipleNamedBinaryImageFieldMixin from './MultipleNamedBinaryImageFieldMixin.js';
import { MultipleNamedBinaryFileField } from '../multiple-named-binary-file';
import { ResolutionValidatorConfig } from '../named-binary-image';

/**
 * MultipleNamedBinFile guiField class.
 * This field takes and returns array with objects, consisting of 2 properties:
 * - name - string - name of file;
 * - mediaType - string - MIME type of file;
 * - content - base64 string - content of file.
 */
class MultipleNamedBinaryImageField extends MultipleNamedBinaryFileField {
    constructor(options) {
        super(options);
        this.resolutionConfig = ResolutionValidatorConfig.createIfNeeded(this.props);
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(MultipleNamedBinaryImageFieldMixin);
    }
}

export default MultipleNamedBinaryImageField;
