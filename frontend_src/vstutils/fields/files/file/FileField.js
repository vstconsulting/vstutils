import { TextAreaField } from '../../text';
import FileFieldMixin from './FileFieldMixin.js';

/**
 * File guiField class.
 */
class FileField extends TextAreaField {
    constructor(options) {
        super(options);

        this.maxSize = options.max_size;
    }

    static get mixins() {
        return super.mixins.concat(FileFieldMixin);
    }

    isFileSizeValid(fileSize) {
        if (this.maxSize !== undefined) {
            return this.maxSize <= fileSize;
        }
        return true;
    }
}

export default FileField;
