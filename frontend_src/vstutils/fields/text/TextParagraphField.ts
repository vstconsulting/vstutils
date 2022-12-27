import { defineComponent } from 'vue';
import { BaseField } from '@/vstutils/fields/base';
import TextParagraphFieldContentReadonly from './TextParagraphFieldContentReadonly.vue';
import TextAreaFieldContentEdit from './TextAreaFieldContentEdit.vue';

const TextParagraphFieldMixin = defineComponent({
    components: {
        field_content_readonly: TextParagraphFieldContentReadonly,
        field_content_edit: TextAreaFieldContentEdit,
    },
});

export class TextParagraphField extends BaseField<string | string[] | Record<string, unknown>, string> {
    toRepresent(data: Record<string, unknown>) {
        let value = this.getDataInnerValue(data);

        if (value === undefined) {
            value = this.options.default;
        }

        if (typeof value == 'object') {
            if (Array.isArray(value)) {
                return value.join(' ');
            }

            return JSON.stringify(value);
        }

        return value;
    }
    static get mixins() {
        return [TextParagraphFieldMixin];
    }
}
