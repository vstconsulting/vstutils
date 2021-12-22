import ChoicesFieldContentEdit from './ChoicesFieldContentEdit.vue';
import { BaseFieldContentReadonlyMixin, BaseFieldListView, BaseFieldMixin } from '../base';
import { stringToCssClass } from '../../utils';

function preparedValue() {
    let val = BaseFieldContentReadonlyMixin.computed.preparedValue.call(this);
    if (val && this.field.enum) {
        for (const enumVal of this.field.prepareEnumData(this.field.enum)) {
            if (enumVal && enumVal.id === val) {
                val = enumVal.text;
                break;
            }
        }
    }
    return this.$parent.translateValue(val);
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
                classes.push(`value-${stringToCssClass(this.value)}`);
            }
            return classes;
        },
    },
    methods: {
        translateValue(value) {
            const key = `:model:${this.field.model?.translateModel || ''}:${
                this.field.translateFieldName
            }:${value}`;
            if (this.$te(key)) {
                return this.$t(key);
            }
            return value;
        },
    },
};

export default ChoicesFieldMixin;
