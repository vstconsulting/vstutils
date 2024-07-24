import { reactive } from 'vue';
import { within } from '@testing-library/dom';
import { userEvent } from '@testing-library/user-event';
import { createApp, createSchema, waitFor, mount } from '#unittests';
import schema from './DeepFKField-schema.json';

describe('DeepFKfield', () => {
    let app;
    let Category;
    let deepFk;
    let deepFkArray;

    beforeAll(async () => {
        app = await createApp({ schema: createSchema(schema) });
        Category = app.modelsResolver.byReferencePath('#/definitions/Category');
        deepFk = app.fieldsResolver.resolveField({
            name: 'testField',
            type: 'integer',
            format: 'deep_fk',
            'x-options': {
                makeLink: true,
                model: { $ref: '#/definitions/Category' },
                usePrefetch: true,
                value_field: 'id',
                view_field: 'name',
                parent_field_name: 'parent',
                only_last_child: true,
            },
        });
        deepFkArray = app.fieldsResolver.resolveField({
            name: 'testField',
            type: 'array',
            items: {
                type: 'integer',
                format: 'deep_fk',
                'x-options': {
                    makeLink: true,
                    model: { $ref: '#/definitions/Category' },
                    usePrefetch: true,
                    value_field: 'id',
                    view_field: 'name',
                    parent_field_name: 'parent',
                    only_last_child: true,
                },
            },
        });
    });

    beforeEach(() => {
        fetchMock.resetMocks();
    });

    test('parent value', () => {
        const category = new Category({ parent: 123 });
        expect(deepFk.getParentFieldValue(category)).toBe(123);
    });
    test('tree data', () => {
        const data = [
            new Category({ id: 1, parent: null, name: 'Parent 1' }),
            new Category({ id: 2, parent: 1, name: 'Child 1.1' }),
        ];

        const tree = deepFk.createTreeData(data);
        expect(tree[0]).toMatchObject({ id: 1, parent: null, text: 'Parent 1' });
        expect(tree[0].children.length).toBe(1);
        expect(tree[0].children[0]).toMatchObject({ id: 2, parent: 1, text: 'Child 1.1' });
    });

    test('only last child', async () => {
        fetchMock.mockResponseOnce(
            JSON.stringify([
                {
                    status: 200,
                    data: {
                        count: 2,
                        results: [
                            { id: 1, parent: null, name: 'Cat 1' },
                            { id: 2, parent: 1, name: 'Cat 1.1' },
                        ],
                    },
                },
            ]),
        );

        const wrapper = mount(deepFk.getComponent(), {
            propsData: {
                type: 'edit',
                data: {},
                field: deepFk,
            },
        });

        const emitted = wrapper.emitted();

        // Wait for categories to load and display
        await waitFor(() => expect(wrapper.find('li[data-id="1"]').exists()).toBeTruthy());

        // Select category with subcategory
        wrapper.find('li[data-id="1"]').trigger('click');
        await wrapper.vm.$nextTick();
        expect(emitted['set-value']).toBeFalsy();

        // Open subcategory
        wrapper.find('li[data-id="1"]').find('.tree-arrow').trigger('click');
        await wrapper.vm.$nextTick();
        expect(emitted['set-value']).toBeFalsy();

        // Select category without subcategory
        wrapper.find('li[data-id="2"]').find('.tree-content').trigger('click');
        expect(emitted['set-value'].length).toBe(1);
        expect(emitted['set-value'][0][0].value.getPkValue()).toBe(2);
    });

    test('deep fk field array', async () => {
        fetchMock.mockResponseOnce(
            JSON.stringify([
                {
                    status: 200,
                    data: {
                        count: 2,
                        results: [
                            { id: 1, parent: null, name: 'Cat 1' },
                            { id: 2, parent: 1, name: 'Cat 1.1' },
                            { id: 4, parent: null, name: 'Cat 3' },
                            { id: 3, parent: null, name: 'Cat 2' },
                        ],
                    },
                },
            ]),
        );
        const data = reactive({ testField: [2, 3] });
        const wrapper = mount({
            template: `<transition><field type="edit" :field="field" :data="data" @set-value="setValue" /></transition>`,
            components: {
                field: deepFkArray.getComponent(),
            },
            setup() {
                const field = deepFkArray;
                function setValue(e) {
                    data.testField = e.value;
                }
                return { data, field, setValue };
            },
        });

        const user = userEvent.setup({ document: wrapper.vm.$el.ownerDocument });
        const screen = within(wrapper.element);

        // Cat 1.1 is selected so must be visible when opened
        const cat1_1 = await screen.findByText(
            (content, el) => content === 'Cat 1.1' && el.parentElement.classList.contains('tree-anchor'),
        );

        // Unselect Cat 1.1
        user.click(cat1_1);
        await waitFor(() => expect(data.testField.length).toBe(1));
        expect(data.testField[0].id).toBe(3);
    });
});
