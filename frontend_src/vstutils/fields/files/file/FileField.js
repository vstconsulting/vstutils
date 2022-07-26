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
        this.allowedMediaTypes = this._parseAllowedMediaTypes();
    }

    _parseAllowedMediaTypes() {
        if (this.props.media_types) {
            return this.props.media_types;
        }
        if (this.options['x-validators']?.extensions) {
            return this.options['x-validators']?.extensions;
        }
        return null;
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
