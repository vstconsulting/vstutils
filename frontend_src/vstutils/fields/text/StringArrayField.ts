import { defineComponent } from 'vue';

import { TextAreaField, TextAreaFieldMixin } from './TextAreaField';
import StringArrayFieldListView from './StringArrayFieldListView.vue';

const StringArrayFieldMixin = defineComponent({
    components: {
        field_list_view: StringArrayFieldListView,
    },
    extends: TextAreaFieldMixin,
});

export class StringArrayField extends TextAreaField {
    static get mixins() {
        return [StringArrayFieldMixin];
    }
}
