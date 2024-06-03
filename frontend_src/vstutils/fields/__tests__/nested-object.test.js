import { createApp } from '../../../unittests/create-app.ts';

describe('NestedObject field', () => {
    let app;

    beforeAll(async () => {
        app = await createApp();
    });

    test('toInner', () => {
        const TestModel = app.modelsResolver.bySchemaObject(
            {
                properties: {
                    field: {
                        type: 'object',
                        properties: {
                            someArray: {
                                type: 'array',
                                collectionFormat: 'csv',
                                items: { type: 'string' },
                            },
                        },
                    },
                },
            },
            'TestModel',
        );
        const field = TestModel.fields.get('field');

        expect(
            TestModel.representToInner({
                field: {
                    someArray: ['value1', 'value2'],
                },
            }),
        ).toStrictEqual({
            field: {
                someArray: 'value1,value2',
            },
        });

        expect(TestModel.fromRepresentData({ field: null })._getInnerData()).toStrictEqual({ field: null });

        expect(
            TestModel.representToInner({
                field: new field.nestedModel({ someArray: 'value2,value1' }),
            }),
        ).toStrictEqual({
            field: {
                someArray: 'value2,value1',
            },
        });
    });
});
