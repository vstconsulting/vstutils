import { defineComponent } from 'vue';
import { BaseField } from '@/vstutils/fields/base';
import TextParagraphFieldContentReadonly from './TextParagraphFieldContentReadonly.vue';
import TextAreaFieldContentEdit from './TextAreaFieldContentEdit.vue';
import type { InnerData } from '@/vstutils/utils';

const TextParagraphFieldMixin = defineComponent({
    components: {
        field_content_readonly: TextParagraphFieldContentReadonly,
        field_content_edit: TextAreaFieldContentEdit,
    },
});

export class TextParagraphField extends BaseField<string | string[] | Record<string, unknown>, string> {
    toRepresent(data: InnerData) {
        let value = this.getValue(data);

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
