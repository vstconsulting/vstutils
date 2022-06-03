import { StringField } from './index';
import { BaseFieldContentReadonlyMixin, BaseFieldMixin } from '../base';

/** @vue/component */
const URIFieldReadonly = {
    mixins: [BaseFieldContentReadonlyMixin],
    render(h) {
        return h('a', { attrs: { href: this.value } }, this.value);
    },
};

/** @vue/component */
const URIFieldMixin = {
    components: {
        field_content_readonly: URIFieldReadonly,
    },
    mixins: [BaseFieldMixin],
};

export class URIField extends StringField {
    static get mixins() {
        return [URIFieldMixin];
    }
}
