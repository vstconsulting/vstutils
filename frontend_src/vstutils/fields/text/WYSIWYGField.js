import TextAreaField from './TextAreaField.js';
import { BaseFieldMixin, BaseFieldInnerComponentMixin } from '../base';
import { WYSIWYGEditor } from '../../components/wysiwyg-editor';

/** @vue/component */
const WYSIWYGFieldInner = {
    mixins: [BaseFieldInnerComponentMixin],
    render(h) {
        return h(WYSIWYGEditor, {
            props: {
                readOnly: this.$parent.type === 'readonly',
                initialValue: this.value,
            },
            on: { change: (data) => this.$emit('set-value', data) },
        });
    },
};

/** @vue/component */
export const WYSIWYGFieldMixin = {
    components: {
        field_content_readonly: WYSIWYGFieldInner,
        field_content_edit: WYSIWYGFieldInner,
    },
    mixins: [BaseFieldMixin],
};

export class WYSIWYGField extends TextAreaField {
    static get mixins() {
        return [WYSIWYGFieldMixin];
    }
}
