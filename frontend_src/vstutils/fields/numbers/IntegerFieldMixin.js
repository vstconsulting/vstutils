import { BaseFieldContentEdit } from '../base';
import IntegerFieldContentMixin from './IntegerFieldContentMixin.js';

const IntegerFieldMixin = {
    components: {
        field_content_edit: {
            mixins: [BaseFieldContentEdit, IntegerFieldContentMixin],
        },
    },
};

export default IntegerFieldMixin;
