import {
    createApp,
    createSchema,
    schemaListOf,
    waitForPageLoading,
    openPage,
    expectNthRequest,
} from '#unittests';

const schema = createSchema({
    paths: {
        '/attribute/': {
            get: {
                operationId: 'attribute_list',
                responses: {
                    200: {
                        schema: schemaListOf({
                            $ref: '#/definitions/Attribute',
                        }),
                    },
                },
            },
        },
        '/attribute/{id}/': {
            parameters: [{ name: 'id', in: 'path', required: true, type: 'integer' }],
            get: {
                operationId: 'attribute_get',
                responses: {
                    200: {
                        schema: {
                            $ref: '#/definitions/Attribute',
                        },
                    },
                },
            },
            patch: {
                operationId: 'attribute_edit',
                parameters: [
                    {
                        name: 'data',
                        in: 'body',
                        required: true,
                        schema: {
                            $ref: '#/definitions/Attribute',
                        },
                    },
                ],
                responses: {
                    200: {
                        schema: {
                            $ref: '#/definitions/Attribute',
                        },
                    },
                },
            },
        },
        '/predefined_attribute/': {
            get: {
                operationId: 'predefined_attribute_list',
                responses: {
                    200: {
                        schema: schemaListOf({
                            $ref: '#/definitions/PredefinedAttribute',
                        }),
                    },
                },
            },
        },
    },
    definitions: {
        Attribute: {
            required: ['key', 'value'],
            type: 'object',
            properties: {
                id: { type: 'integer', readOnly: true },
                key: {
                    type: 'integer',
                    format: 'fk',
                    'x-options': {
                        model: { $ref: '#/definitions/PredefinedAttribute' },
                        value_field: 'id',
                        view_field: 'name',
                        usePrefetch: true,
                    },
                },
                value: {
                    type: 'string',
                    format: 'dynamic_fk',
                    'x-options': {
                        field: 'key',
                        field_attribute: 'field_type',
                        types: {
                            complex_field: { type: 'boolean' },
                        },
                    },
                },
            },
        },
        PredefinedAttribute: {
            required: ['id', 'field_type'],
            type: 'object',
            properties: {
                id: { type: 'integer' },
                field_type: {
                    type: 'string',
                    enum: ['multiplenamedbinimage', 'boolean'],
                },
            },
        },
    },
});

describe('DependFromFkField', () => {
    let app;

    beforeAll(async () => {
        app = await createApp({ schema });
    });

    beforeEach(async () => {
        fetchMock.resetMocks();
        await openPage('/');
    });

    test('prefetch value', async () => {
        fetchMock.mockResponses(
            [
                JSON.stringify([
                    {
                        status: 200,
                        path: '/attribute/1/',
                        data: {
                            id: 1,
                            key: 1,
                            // multiplenamedbinimage comes as json string from backend
                            // this field must parse string in toRepresent
                            value: JSON.stringify([
                                {
                                    name: 'some image',
                                    mediaType: 'image/png',
                                    content: 'base64content',
                                },
                            ]),
                        },
                    },
                ]),
            ],
            [
                JSON.stringify([
                    {
                        status: 200,
                        data: {
                            count: 1,
                            results: [
                                {
                                    id: 1,
                                    field_type: 'multiplenamedbinimage',
                                },
                            ],
                        },
                    },
                ]),
            ],
        );

        await app.router.push('/attribute/1/');
        await waitForPageLoading();

        expect(fetchMock).toBeCalledTimes(2);
        // page hit
        expectNthRequest(0, {
            method: 'put',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([
                {
                    method: 'get',
                    path: ['attribute', '1'],
                },
            ]),
        });
        // prefetch hit
        expectNthRequest(1, {
            method: 'put',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([
                {
                    method: 'get',
                    path: ['predefined_attribute'],
                    query: 'id=1&limit=1',
                },
            ]),
        });

        // check that 'key' prefetched
        expect(app.store.page.sandbox.key.id).toBe(1);
        expect(app.store.page.sandbox.key.field_type).toBe('multiplenamedbinimage');

        // check that 'value' parsed
        expect(Array.isArray(app.store.page.sandbox.value)).toBe(true);
    });

    test('boolean field initial value on edit page', async () => {
        fetchMock.mockResponses(
            [
                JSON.stringify([
                    {
                        status: 200,
                        path: '/attribute/1/',
                        data: {
                            id: 1,
                            key: 1,
                            value: 'true',
                        },
                    },
                ]),
            ],
            [
                JSON.stringify([
                    {
                        status: 200,
                        data: {
                            count: 1,
                            results: [
                                {
                                    id: 1,
                                    field_type: 'complex_field',
                                },
                            ],
                        },
                    },
                ]),
            ],
        );
        await app.router.push('/attribute/1/edit/');
        await waitForPageLoading();
        expect(fetchMock).toBeCalledTimes(2);
        expect(app.store.page.sandbox.value).toBe(true);
    });

    test('model is set', () => {
        const Attribute = app.modelsResolver.get('Attribute');
        const PredefinedAttribute = app.modelsResolver.get('PredefinedAttribute');
        expect(
            Attribute.fields
                .get('value')
                .getRealField({ key: new PredefinedAttribute({ id: 1, field_type: 'boolean' }) }).model,
        ).toBe(Attribute);
    });
});
