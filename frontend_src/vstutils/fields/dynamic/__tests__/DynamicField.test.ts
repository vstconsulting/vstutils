import { StringField } from '@/vstutils/fields/text';
import { DynamicField } from '../DynamicField';
import { createApp } from '@/unittests';
import VueI18n from 'vue-i18n';
import { nextTick, reactive } from 'vue';
import { mount } from '@vue/test-utils';

let app: Awaited<ReturnType<typeof createApp>>;

beforeAll(async () => {
    app = await createApp();
});

describe('DynamicField', () => {
    test('real field with same structure will not trigger value reset', async () => {
        const field = new DynamicField({
            name: 'field',
            type: 'string',
            'x-options': {
                field: ['someField'],
                types: {},
            },
        });

        // Override getRealField to return field of same type but different instance
        field.getRealField = function getRealField() {
            return new StringField({
                name: 'field',
                type: 'string',
            });
        };

        const data = reactive({ someField: 'val 1', field: 'initial value' });
        const setValue = vitest.fn();
        const wrapper = mount(
            {
                template: `<Field :field="field" :data="data" type="readonly" @set-value="setValue" />`,
                components: { Field: field.getComponent() },
                setup() {
                    return {
                        field,
                        data: data,
                        setValue,
                    };
                },
            },
            { localVue: app.vue, i18n: new VueI18n() },
        );

        expect(wrapper.html()).toMatch(/initial value/);
        expect(setValue).toBeCalledTimes(0);
        data.someField = 'val 2';
        await nextTick();
        expect(wrapper.html()).toMatch(/initial value/);
        expect(setValue).toBeCalledTimes(0);
    });
});
