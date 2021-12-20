import { addCssClassesToElement } from '../../utils';
import PlainTextFieldContentReadonly from './PlainTextFieldContentReadonly.vue';

const PlainTextFieldMixin = {
    data() {
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
    components: {
        field_content_readonly: PlainTextFieldContentReadonly,
    },
};

export default PlainTextFieldMixin;
