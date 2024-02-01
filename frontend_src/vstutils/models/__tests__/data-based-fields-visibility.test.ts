import { expect, test, beforeAll, describe } from '@jest/globals';
import { createApp, createSchema, schemaListOf, mountApp, useTestCtx } from '@/unittests';
import fetchMock from 'jest-fetch-mock';

const schema = createSchema({
    paths: {
        '/test/': {
            get: {
                operationId: 'test_list',
                responses: {
                    200: {
                        description: '',
                        schema: schemaListOf({
                            $ref: '#/definitions/Test',
                        }),
                    },
                },
            },
        },
        '/test/{id}/': {
            parameters: [{ name: 'id', in: 'path', required: true, type: 'integer' }],
            get: {
                operationId: 'test_get',
                responses: {
                    200: {
                        description: '',
                        schema: { $ref: '#/definitions/Test' },
                    },
                },
            },
            put: {
                operationId: 'test_update',
                parameters: [
                    {
                        name: 'data',
                        in: 'body',
                        required: true,
                        schema: { $ref: '#/definitions/Test' },
                    },
                ],
                responses: {
                    200: {
                        description: '',
                        schema: { $ref: '#/definitions/Test' },
                    },
                },
            },
        },
    },
    definitions: {
        Test: {
            type: 'object',
            properties: {
                id: { type: 'integer', readOnly: true },
                field1: { type: 'string' },
                field2: { type: 'string' },
                _visibility: {
                    type: 'object',
                    properties: {
                        field1: { type: 'boolean' },
                        field2: { type: 'boolean' },
                    },
                },
            },
            'x-visibility-data-field-name': '_visibility',
        },
    },
});

beforeAll(async () => {
    const app = await createApp({ schema });
    await mountApp();
    app.api.disableBulk = true;
});

describe('data based fields visibility', () => {
    test('detail readonly', async () => {
        const { app, screen } = useTestCtx();
        fetchMock.enableMocks();

        // All fields visible
        fetchMock.mockOnceIf(
            'http://test.vst/api/v1/test/1/',
            JSON.stringify({
                id: 1,
                field1: 'field1 value',
                field2: 'field2 value',
                _visibility: undefined,
            }),
        );
        await app.router.push('/test/1/');
        await expect(screen.findByText('field1 value')).resolves.toBeTruthy();
        await expect(screen.findByText('field2 value')).resolves.toBeTruthy();

        // One field hidden
        fetchMock.mockOnceIf(
            'http://test.vst/api/v1/test/2/',
            JSON.stringify({
                id: 2,
                field1: 'field1 value',
                field2: 'field2 value',
                _visibility: {
                    field1: true,
                    field2: false,
                },
            }),
        );
        await app.router.push('/test/2/');
        await expect(screen.findByText('field1 value')).resolves.toBeTruthy();
        await expect(screen.findByText('field2 value')).rejects.toThrow();
    });

    test('detail edit', async () => {
        const { app, screen } = useTestCtx();
        fetchMock.enableMocks();

        // All fields visible
        fetchMock.mockOnceIf(
            'http://test.vst/api/v1/test/1/',
            JSON.stringify({
                id: 1,
                field1: 'field1 value',
                field2: 'field2 value',
                _visibility: undefined,
            }),
        );

        await app.router.push('/test/1/edit/');
        await expect(screen.findByLabelText('Field1', { selector: 'input' })).resolves.toBeTruthy();
        await expect(screen.findByLabelText('Field2', { selector: 'input' })).resolves.toBeTruthy();

        // One field hidden
        fetchMock.mockOnceIf(
            'http://test.vst/api/v1/test/2/',
            JSON.stringify({
                id: 2,
                field1: 'field1 value',
                field2: 'field2 value',
                _visibility: {
                    field1: true,
                    field2: false,
                },
            }),
        );
        await app.router.push('/test/2/edit/');
        await expect(screen.findByLabelText('Field1', { selector: 'input' })).resolves.toBeTruthy();
        await expect(screen.findByLabelText('Field2', { selector: 'input' })).rejects.toThrow();
    });
});
