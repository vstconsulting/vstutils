import { BaseFieldContentReadonlyMixin, BaseFieldContentEdit } from '../base';
import DateTimeFieldContent from './DateTimeFieldContent';

const DateTimeFieldMixin = {
    components: {
        field_content_readonly: {
            mixins: [BaseFieldContentReadonlyMixin, DateTimeFieldContent],
        },
        field_content_edit: {
            mixins: [BaseFieldContentEdit, DateTimeFieldContent],
        },
    },
};

export default DateTimeFieldMixin;
