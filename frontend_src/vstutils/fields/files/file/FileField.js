import { TextAreaField } from '../../text';
import FileFieldMixin from './FileFieldMixin.js';

/**
 * File guiField class.
 */
class FileField extends TextAreaField {
    static fkLinkable = false;

    constructor(options) {
        super(options);

        this.maxSize = options.max_size;
        this.allowedMediaTypes = this.options['x-validators']?.extensions;
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
