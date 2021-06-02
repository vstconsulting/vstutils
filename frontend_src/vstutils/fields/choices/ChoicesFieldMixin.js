import ChoicesFieldContentEdit from './ChoicesFieldContentEdit.vue';
import { BaseFieldMixin } from '../base';

const ChoicesFieldMixin = {
    mixins: [BaseFieldMixin],
    components: {
        field_content_edit: ChoicesFieldContentEdit,
    },
    computed: {
        wrapperClasses() {
            const classes = BaseFieldMixin.computed.wrapperClasses.call(this);
            if (this.value) {
                classes.push(`value-${this.value}`);
            }
            return classes;
        },
    },
};

export default ChoicesFieldMixin;
