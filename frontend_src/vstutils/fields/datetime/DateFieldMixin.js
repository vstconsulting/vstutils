import { BaseFieldContentReadonlyMixin, BaseFieldContentEdit } from '../base';
import DateFieldContent from './DateFieldContent.js';

const DateFieldMixin = {
    components: {
        field_content_readonly: {
            mixins: [BaseFieldContentReadonlyMixin, DateFieldContent],
        },
        field_content_edit: {
            mixins: [BaseFieldContentEdit, DateFieldContent],
        },
    },
};

export default DateFieldMixin;
