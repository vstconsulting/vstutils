import { defineComponent } from 'vue';

import { BaseField, BaseFieldMixin } from '#vstutils/fields/base';

import TextAreaFieldContentEdit from './TextAreaFieldContentEdit.vue';
import TextAreaFieldContentReadonly from './TextAreaFieldContentReadonly.vue';

import type { FieldMixin } from '#vstutils/fields/base';

export const TextAreaFieldMixin = defineComponent({
    components: {
        field_content_edit: TextAreaFieldContentEdit,
        field_content_readonly: TextAreaFieldContentReadonly,
    },
    extends: BaseFieldMixin,
});

export class TextAreaField extends BaseField<string, string> {
    static get mixins(): FieldMixin[] {
        return [TextAreaFieldMixin];
    }
}
