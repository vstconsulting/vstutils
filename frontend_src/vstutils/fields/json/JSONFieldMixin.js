import { addCssClassesToElement } from '../../utils';
import { BaseFieldContentReadonlyMixin } from '../base';
import JsonFieldContentReadonly from './JsonFieldContentReadonly.vue';
import { TextAreaFieldContentEdit } from '../text';

const JSONFieldMixin = {
    data: function () {
        return {
            wrapper_classes_list: {
                base:
                    'form-group ' +
                    addCssClassesToElement(
                        'guiField',
                        this.field.options.name,
                        this.field.options.format || this.field.options.type,
                    ),
                grid: 'col-lg-12 col-xs-12 col-sm-12 col-md-12',
            },
        };
    },
    provide() {
        return {
            jsonMapper: this.field.jsonMapper,
        };
    },
    components: {
        field_content_readonly: {
            mixins: [BaseFieldContentReadonlyMixin, JsonFieldContentReadonly],
        },
        field_content_edit: {
            mixins: [TextAreaFieldContentEdit],
        },
    },
};

export default JSONFieldMixin;
