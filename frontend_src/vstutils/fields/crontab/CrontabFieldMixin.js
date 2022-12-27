import { BaseFieldContentEdit } from '../base';
import CrontabFieldContentEdit from './CrontabFieldContentEdit.vue';

const CrontabFieldMixin = {
    components: {
        field_content_edit: {
            mixins: [BaseFieldContentEdit, CrontabFieldContentEdit],
        },
    },
};

export default CrontabFieldMixin;
