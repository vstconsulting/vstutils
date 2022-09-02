import { expect, test, describe, beforeAll } from '@jest/globals';
import { createApp } from '../../../unittests/create-app.js';

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

        const instance = new TestModel();
        const field = TestModel.fields.get('field');

        instance._validateAndSetData({
            field: {
                someArray: ['value1', 'value2'],
            },
        });
        expect(instance._getInnerData()).toEqual({
            field: {
                someArray: 'value1,value2',
            },
        });

        instance._validateAndSetData({ field: null });
        expect(instance._getInnerData()).toEqual({ field: null });

        instance._validateAndSetData({
            field: new field.nestedModel({ someArray: 'value2,value1' }),
        });
        expect(instance._getInnerData()).toEqual({
            field: {
                someArray: 'value2,value1',
            },
        });
    });
});
