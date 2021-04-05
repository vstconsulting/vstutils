import { TextAreaField } from '../../text';
import FileFieldMixin from './FileFieldMixin.js';

/**
 * File guiField class.
 */
class FileField extends TextAreaField {
    constructor(options) {
        super(options);

        this.maxSize = options.max_size;
        this.extensions = options.additionalProperties?.extensions?.map((ext) => '.' + ext).join(',');
    }

    /**
     *
     * @return {Mixins}
     */
    static get mixins() {
        return super.mixins.concat(FileFieldMixin);
    }
}

export default FileField;
