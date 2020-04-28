import { TextAreaField } from '../../text';
import FileFieldMixin from './FileFieldMixin.js';

/**
 * File guiField class.
 */
class FileField extends TextAreaField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(FileFieldMixin);
    }
}

export default FileField;
