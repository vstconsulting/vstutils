import { createApp, createSchema } from '#unittests';
import { useEntityViewClasses } from '#vstutils/store';
import { ref } from 'vue';
import { emptyRepresentData } from '#vstutils/utils';

test('fields container classes', async () => {
    const app = await createApp({ schema: createSchema() });

    const TestModel = app.modelsResolver.bySchemaObject({
        properties: {
            some_boolean: { type: 'boolean' },
            some_choice: { type: 'string', enum: ['option1', 'option2'] },
            some_string: { type: 'string' },
            some_object: {
                type: 'object',
                properties: {
                    some_boolean: { type: 'boolean' },
                    some_choice: { type: 'string', enum: ['option1', 'option2'] },
                    some_string: { type: 'string' },
                },
            },
        },
    });

    const data = ref(emptyRepresentData());
    const classes = useEntityViewClasses(ref(TestModel), data);

    expect(classes.value).toStrictEqual([]);

    data.value = {
        ...emptyRepresentData(),
        some_boolean: true,
        some_choice: 'option1',
        some_string: 'some str',
        some_object: {
            some_boolean: false,
            some_choice: 'option2',
            some_string: 'other str',
        },
    };

    expect(classes.value).toStrictEqual([
        'field-some_boolean-true',
        'field-some_choice-option1',
        'field-some_object-some_boolean-false',
        'field-some_object-some_choice-option2',
    ]);
});
