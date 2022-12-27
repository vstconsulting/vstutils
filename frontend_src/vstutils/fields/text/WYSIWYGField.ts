import { h } from 'vue';

import { WYSIWYGEditor } from '@/vstutils/components/wysiwyg-editor';
import { defineFieldComponent } from '@/vstutils/fields/base';

import { TextAreaField } from './TextAreaField';

export const WYSIWYGFieldMixin = defineFieldComponent<WYSIWYGField>({
    readonly: (props) => () =>
        h(WYSIWYGEditor, {
            props: { readOnly: true, initialValue: props.value },
        }),

    edit:
        (props, { emit }) =>
        () =>
            h(WYSIWYGEditor, {
                props: { readOnly: false, initialValue: props.value },
                on: { change: (data: string) => emit('set-value', data) },
            }),
});

export class WYSIWYGField extends TextAreaField {
    static get mixins() {
        return [WYSIWYGFieldMixin];
    }
}
