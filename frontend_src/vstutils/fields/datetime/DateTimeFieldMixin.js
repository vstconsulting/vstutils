import {
    BaseFieldContentReadonlyMixin,
    BaseFieldContentEdit,
    BaseFieldMixin,
    BaseFieldListView,
} from '../base';
import DateTimeFieldContent from './DateTimeFieldContent';

const DateTimeFieldMixin = {
    mixins: [BaseFieldMixin],
    components: {
        field_content_readonly: {
            mixins: [BaseFieldContentReadonlyMixin, DateTimeFieldContent],
        },
        field_content_edit: {
            mixins: [BaseFieldContentEdit, DateTimeFieldContent],
            data: () => ({ format: 'YYYY-MM-DDTHH:mm' }),
        },
        field_list_view: {
            mixins: [BaseFieldListView, DateTimeFieldContent],
        },
    },
};

export default DateTimeFieldMixin;
