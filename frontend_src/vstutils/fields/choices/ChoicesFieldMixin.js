import ChoicesFieldContentEdit from './ChoicesFieldContentEdit.vue';
import { BaseFieldContentReadonlyMixin, BaseFieldListView, BaseFieldMixin } from '../base';

function preparedValue() {
    const val = BaseFieldContentReadonlyMixin.computed.preparedValue.call(this);
    if (val && this.field.enum) {
        for (const enumVal of this.field.prepareEnumData(this.field.enum)) {
            if (enumVal && enumVal.id === val) {
                return enumVal.text;
            }
        }
    }
    return val;
}

const ChoicesFieldMixin = {
    mixins: [BaseFieldMixin],
    components: {
        field_content_edit: ChoicesFieldContentEdit,
        field_content_readonly: {
            extends: BaseFieldContentReadonlyMixin,
            computed: {
                preparedValue() {
                    return preparedValue.call(this);
                },
            },
        },
        field_list_view: {
            extends: BaseFieldListView,
            computed: {
                preparedValue() {
                    return preparedValue.call(this);
                },
            },
        },
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
