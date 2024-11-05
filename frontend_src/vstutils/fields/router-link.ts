import { computed, h } from 'vue';
import { BaseField, defineFieldComponent } from './base';
import FieldWrapper from './base/FieldWrapper.vue';
import { InnerData } from '#vstutils/utils';

type Data = { link?: string; label: string };

const RouterLinkFieldComponent = defineFieldComponent<RouterLinkField>((props) => {
    const value = computed(() => props.field.getValue(props.data));
    return () => {
        const link = value.value;
        return h(FieldWrapper, { props }, [
            link?.link
                ? h('router-link', { props: { to: link.link } }, [link.label])
                : h('span', [link?.label ?? '']),
        ]);
    };
});

export class RouterLinkField extends BaseField<Data, Data> {
    override toRepresent(data: InnerData) {
        const value = this.getValue(data);
        if (value) {
            if (typeof value !== 'object') {
                this.error(`Value must be an object, got: ${value}`);
            }
            if (typeof value.label !== 'string') {
                this.error(`Label must be a string, got: ${value.label}`);
            }
            if (value.link && typeof value.link !== 'string') {
                this.error(`Link must be a string, got: ${value.link}`);
            }
        }
        return value;
    }

    override getComponent() {
        return RouterLinkFieldComponent;
    }
}
