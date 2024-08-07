import { createApp, createSchema, schemaListOf, waitForPageLoading, openPage } from '#unittests';
import type { getApp } from '#vstutils/utils';
import { ModelValidationError } from '..';
import { emptyInnerData } from '#vstutils/utils';
import { screen } from '@testing-library/dom';

let app: Awaited<ReturnType<typeof getApp>>;

const schema = createSchema({
    swagger: '2.0',
    paths: {
        '/first/': {
            get: {
                operationId: 'first_list',
                responses: {
                    200: {
                        description: '',
                        schema: schemaListOf({
                            $ref: '#/definitions/First',
                        }),
                    },
                },
            },
        },
        '/first/{id}/': {
            parameters: [{ name: 'id', in: 'path', required: true, type: 'integer' }],
            get: {
                operationId: 'first_get',
                responses: {
                    200: {
                        description: '',
                        schema: {
                            $ref: '#/definitions/First',
                        },
                    },
                },
            },
            put: {
                operationId: 'first_update',
                parameters: [
                    {
                        name: 'data',
                        in: 'body',
                        required: true,
                        schema: {
                            $ref: '#/definitions/First',
                        },
                    },
                ],
                responses: {
                    200: {
                        description: '',
                        schema: {
                            $ref: '#/definitions/First',
                        },
                    },
                },
            },
        },
        '/fourth/': {
            get: {
                operationId: 'fourth_list',
                responses: {
                    200: {
                        description: '',
                        schema: schemaListOf({
                            $ref: '#/definitions/Fourth',
                        }),
                    },
                },
            },
        },
        '/fourth/{id}/': {
            parameters: [{ name: 'id', in: 'path', required: true, type: 'integer' }],
            get: {
                operationId: 'fourth_get',
                responses: {
                    200: {
                        description: '',
                        schema: {
                            $ref: '#/definitions/Fourth',
                        },
                    },
                },
            },
            put: {
                operationId: 'fourth_update',
                parameters: [
                    {
                        name: 'data',
                        in: 'body',
                        required: true,
                        schema: {
                            $ref: '#/definitions/Fourth',
                        },
                    },
                ],
                responses: {
                    200: {
                        description: '',
                        schema: {
                            $ref: '#/definitions/Fourth',
                        },
                    },
                },
            },
        },
    },
    definitions: {
        First: {
            type: 'object',
            properties: {
                id: { type: 'integer', readOnly: true },
            },
            additionalProperties: {
                type: 'string',
                minLength: 2,
            },
        },
        Second: {
            type: 'object',
            properties: {
                id: { type: 'integer', readOnly: true },
            },
            additionalProperties: {
                $ref: '#/definitions/SomeRef',
            },
        },
        Third: {
            type: 'object',
            properties: {
                id: { type: 'integer', readOnly: true },
            },
            additionalProperties: {
                type: 'object',
                properties: {
                    some: {
                        type: 'string',
                    },
                },
            },
        },
        Fourth: {
            type: 'object',
            properties: {
                id: { type: 'integer', readOnly: true },
                nested: {
                    type: 'object',
                    additionalProperties: {
                        type: 'string',
                        minLength: 2,
                    },
                },
            },
        },
        Fifth: {
            type: 'object',
            properties: {
                id: { type: 'integer', readOnly: true },
            },
            additionalProperties: true,
        },
        SomeRef: {
            type: 'object',
            properties: {
                id: { type: 'integer', readOnly: true },
            },
        },
    },
});

beforeAll(async () => {
    app = await createApp({ schema });
});

beforeEach(async () => {
    fetchMock.resetMocks();
    await openPage('/');
});

test('model with string additional property', () => {
    const model = app.modelsResolver.bySchemaObject(schema.definitions.First, 'First');
    const instance = new model();
    expect(instance.sandbox.value).toStrictEqual({
        id: undefined,
    });

    // set valid value for additional field
    instance.sandbox.set({
        field: 'some_additional_field',
        value: 'some value',
    });
    expect(() => instance.sandbox.validate()).not.toThrow(ModelValidationError);
    expect(instance.sandbox.value).toStrictEqual({
        id: undefined,
        some_additional_field: 'some value',
    });

    // set invalid value for additional field
    instance.sandbox.set({
        field: 'some_additional_field',
        value: '1',
    });
    expect(() => instance.sandbox.validate()).toThrow(ModelValidationError);

    const innerData = emptyInnerData();
    innerData.id = 1;
    innerData.some_additional_field = 'some value';
    const instance2 = new model(innerData);

    expect(instance2.sandbox.value).toStrictEqual({
        id: 1,
        some_additional_field: 'some value',
    });
});

test('nested object with string additional property', () => {
    const model = app.modelsResolver.bySchemaObject(schema.definitions.Fourth, 'Fourth');
    const instance = new model();
    expect(instance.sandbox.value).toStrictEqual({
        id: undefined,
        nested: undefined,
    });

    instance.sandbox.set({
        field: 'nested',
        value: {
            some_additional_field: 'some value',
        },
    });
    expect(() => instance.sandbox.validate()).not.toThrow(ModelValidationError);
    expect(instance.sandbox.value).toStrictEqual({
        id: undefined,
        nested: {
            some_additional_field: 'some value',
        },
    });

    instance.sandbox.set({
        field: 'nested',
        value: {
            some_additional_field: '1',
        },
    });
    expect(() => instance.sandbox.validate()).toThrow(ModelValidationError);

    const innerData = emptyInnerData();
    innerData.id = 1;
    innerData.nested = {
        some_additional_field: 'some value',
    };
    const instance2 = new model(innerData);

    expect(instance2.sandbox.value).toStrictEqual({
        id: 1,
        nested: {
            some_additional_field: 'some value',
        },
    });
});

test('manipulate keys', () => {
    const model = app.modelsResolver.bySchemaObject(schema.definitions.First, 'First');

    const innerData = emptyInnerData();
    innerData.id = 1;
    innerData.first = { some: 'string' };
    innerData.second = { some: 'string' };
    const instance = new model(innerData);

    expect(instance.sandbox.value).toStrictEqual({
        id: 1,
        first: { some: 'string' },
        second: { some: 'string' },
    });

    // replace key
    instance.sandbox.set({
        field: 'first',
        replaceKeyWith: 'third',
        value: { some: 'string' },
    });

    expect(instance.sandbox.value).toStrictEqual({
        id: 1,
        third: { some: 'string' },
        second: { some: 'string' },
    });

    // delete key
    instance.sandbox.set({
        field: 'third',
        deleteKey: true,
    });
    expect(instance.sandbox.value).toStrictEqual({
        id: 1,
        second: { some: 'string' },
    });
});

test('rendering of model', async () => {
    fetchMock.mockResponse(
        JSON.stringify([
            {
                status: 200,
                data: {
                    id: 1,
                    first_additional_field: 'first',
                    second_additional_field: 'second',
                },
            },
        ]),
    );

    await app.router.push('/first/1/');
    await waitForPageLoading();
    expect(fetchMock).toBeCalledTimes(1);
    expect(app.store.page.sandbox).toStrictEqual({
        id: 1,
        first_additional_field: 'first',
        second_additional_field: 'second',
    });

    await app.router.push('/first/1/edit/');
    await waitForPageLoading();
    expect(fetchMock).toBeCalledTimes(2);
    expect(app.store.page.sandbox).toStrictEqual({
        id: 1,
        first_additional_field: 'first',
        second_additional_field: 'second',
    });

    const addButtons = await screen.findAllByText('Add');
    expect(addButtons.length).toBe(1);
    const addButton = addButtons[0];
    expect(addButton.tagName).toBe('BUTTON');

    const removeButtons = await screen.findAllByText('Remove');
    expect(removeButtons.length).toBe(2);
    expect(removeButtons.every((b) => b.tagName === 'BUTTON')).toBe(true);
});

test('rendering of nested object', async () => {
    fetchMock.mockResponse(
        JSON.stringify([
            {
                status: 200,
                data: {
                    id: 1,
                    nested: {
                        first_additional_field: 'first',
                        second_additional_field: 'second',
                    },
                },
            },
        ]),
    );

    await app.router.push('/fourth/1/');
    await waitForPageLoading();
    expect(fetchMock).toBeCalledTimes(1);
    expect(app.store.page.sandbox).toStrictEqual({
        id: 1,
        nested: {
            first_additional_field: 'first',
            second_additional_field: 'second',
        },
    });

    await app.router.push('/fourth/1/edit/');
    await waitForPageLoading();
    expect(fetchMock).toBeCalledTimes(2);
    expect(app.store.page.sandbox).toStrictEqual({
        id: 1,
        nested: {
            first_additional_field: 'first',
            second_additional_field: 'second',
        },
    });

    const addButtons = await screen.findAllByText('Add');
    expect(addButtons.length).toBe(1);
    const addButton = addButtons[0];
    expect(addButton.tagName).toBe('BUTTON');

    const removeButtons = await screen.findAllByText('Remove');
    expect(removeButtons.length).toBe(2);
    expect(removeButtons.every((b) => b.tagName === 'BUTTON')).toBe(true);
});

test('additionalProperties = true', () => {
    const model = app.modelsResolver.bySchemaObject(schema.definitions.Fifth, 'Fifth');

    const innerData = emptyInnerData();
    innerData.id = 1;
    innerData.first = { some: 'string' };
    innerData.second = 'second';
    const instance = new model(innerData);

    expect(instance.sandbox.value).toStrictEqual({
        id: 1,
        first: { some: 'string' },
        second: 'second',
    });
});
