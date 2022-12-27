import { h } from 'vue';
import { defineFieldComponent } from '@/vstutils/fields/base';
import { StringField } from './StringField';
import type { FieldReadonlySetupFunction } from '@/vstutils/fields/base';

const URIFieldReadonly: FieldReadonlySetupFunction<URIField> = (props) => () => {
    if (props.value) {
        return h('a', { attrs: { href: props.value } }, props.value);
    }
    return null;
};

const URIFieldMixin = defineFieldComponent<URIField>({
    readonly: URIFieldReadonly,
    list: URIFieldReadonly,
});

export class URIField extends StringField {
    static get mixins() {
        return [URIFieldMixin];
    }
}
