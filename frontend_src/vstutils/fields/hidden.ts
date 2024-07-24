import { defineComponent, h } from 'vue';
import { BaseField, FieldPropsDef } from '#vstutils/fields/base';

import type { DefaultXOptions, FieldOptions, FieldPropsDefType } from '#vstutils/fields/base';

export const HiddenFieldMixin = defineComponent({
    props: FieldPropsDef as FieldPropsDefType<HiddenField>,
    render() {
        return h('span');
    },
});

export class HiddenField extends BaseField<unknown, unknown> {
    constructor(options: FieldOptions<DefaultXOptions, unknown>) {
        super(options);
        this.hidden = true;
    }

    static get mixins() {
        return [HiddenFieldMixin];
    }
}
