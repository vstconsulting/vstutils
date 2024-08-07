import { createApp, createSchema, mount } from '#unittests';

describe('PhoneField', () => {
    test('country code selector is rendered', async () => {
        const app = await createApp({
            schema: createSchema(),
        });

        const phoneField = app.fieldsResolver.resolveField({
            name: 'phone',
            type: 'string',
            format: 'phone',
        });

        const wrapper = mount({
            template: '<PhoneField :field="field" :data="{}" type="edit" />',
            components: {
                PhoneField: phoneField.getComponent(),
            },
            setup() {
                return {
                    field: phoneField,
                };
            },
        });

        expect(wrapper.find('select').exists()).toBeTruthy();
    });
});
