import { describe, expect, test, beforeAll, beforeEach } from '@jest/globals';
import { waitFor } from '@testing-library/dom';
import fetchMock from 'jest-fetch-mock';
import { createApp, createSchema, mountApp, schemaListOf, waitForPageLoading, useTestCtx } from '@/unittests';

describe('main action execution', () => {
    beforeAll(async () => {
        const schema = createSchema({
            definitions: {
                Some: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        name: { type: 'string' },
                    },
                },
            },
            paths: {
                '/some/': {
                    get: {
                        // List
                        operationId: 'some_list',
                        responses: {
                            200: {
                                description: '',
                                schema: schemaListOf({ $ref: '#/definitions/Some' }),
                            },
                        },
                    },
                    post: {
                        // Create
                        operationId: 'some_add',
                        parameters: [
                            {
                                name: 'body',
                                in: 'body',
                                required: true,
                                schema: { $ref: '#/definitions/Some' },
                            },
                        ],
                        responses: {
                            201: { description: '', schema: { $ref: '#/definitions/Some' } },
                        },
                    },
                },
                '/some/action/': {
                    post: {
                        // Non empty action
                        operationId: 'some_action',
                        parameters: [
                            {
                                name: 'body',
                                in: 'body',
                                required: true,
                                schema: { $ref: '#/definitions/Some' },
                            },
                        ],
                        responses: {
                            200: { description: '', schema: { $ref: '#/definitions/Some' } },
                        },
                    },
                },
                '/some/{id}/': {
                    parameters: [{ in: 'path', name: 'id', required: true, type: 'string' }],
                    get: {
                        // Detail
                        operationId: 'some_get',
                        responses: {
                            200: { description: '', schema: { $ref: '#/definitions/Some' } },
                        },
                    },
                    patch: {
                        // Update
                        operationId: 'some_update',
                        parameters: [
                            {
                                name: 'body',
                                in: 'body',
                                required: true,
                                schema: { $ref: '#/definitions/Some' },
                            },
                        ],
                        responses: {
                            200: { description: '', schema: { $ref: '#/definitions/Some' } },
                        },
                    },
                },
            },
        });
        await createApp({ schema });
        await mountApp();
        fetchMock.enableMocks();
    });

    beforeEach(() => {
        fetchMock.resetMocks();
    });

    test('create', async () => {
        const { app, user, screen } = useTestCtx();
        await app.router.push('/some/new/');
        await waitForPageLoading();

        fetchMock.mockResponses(
            JSON.stringify([{ status: 200, data: {} }]),
            JSON.stringify([{ status: 200, data: { count: 0, results: [] } }]),
        );

        screen.getByLabelText('Name').focus();
        await user.keyboard('some name{Enter}');

        await waitFor(() => expect(fetchMock).toBeCalledTimes(2));
        // Create new
        expect(fetchMock).nthCalledWith(1, 'http://localhost/api/endpoint/', {
            body: JSON.stringify([{ method: 'post', path: ['some'], data: { name: 'some name' } }]),
            headers: { 'Content-Type': 'application/json' },
            method: 'put',
        });
        // Redirect to list
        expect(fetchMock).nthCalledWith(2, 'http://localhost/api/endpoint/', {
            body: JSON.stringify([{ method: 'get', path: ['some'], query: 'limit=20&offset=0' }]),
            headers: { 'Content-Type': 'application/json' },
            method: 'put',
        });
    });

    test('action', async () => {
        const { app, user, screen } = useTestCtx();
        await app.router.push('/some/action/');
        await waitForPageLoading();

        fetchMock.mockResponses(
            JSON.stringify([{ status: 200, data: {} }]),
            JSON.stringify([{ status: 200, data: { count: 0, results: [] } }]),
        );

        screen.getByLabelText('Name').focus();
        await user.keyboard('some value{Enter}');

        await waitFor(() => expect(fetchMock).toBeCalledTimes(2));
        // Execute action
        expect(fetchMock).nthCalledWith(1, 'http://localhost/api/endpoint/', {
            body: JSON.stringify([{ method: 'post', path: '/some/action/', data: { name: 'some value' } }]),
            headers: { 'Content-Type': 'application/json' },
            method: 'put',
        });
        // Redirect to list
        expect(fetchMock).nthCalledWith(2, 'http://localhost/api/endpoint/', {
            body: JSON.stringify([{ method: 'get', path: ['some'], query: 'limit=20&offset=0' }]),
            headers: { 'Content-Type': 'application/json' },
            method: 'put',
        });
    });

    test('update', async () => {
        const { app, user, screen } = useTestCtx();

        fetchMock.mockResponseOnce(JSON.stringify([{ status: 200, data: { id: 5, name: 'test name' } }]));
        await app.router.push('/some/5/edit/');
        await waitForPageLoading();

        fetchMock.mockResponses(JSON.stringify([{ status: 200, data: {} }]));

        screen.getByLabelText('Name').focus();
        await user.keyboard('new value{Enter}');

        await waitFor(() => expect(fetchMock).toBeCalledTimes(2));
        // Update
        expect(fetchMock).toHaveBeenCalledWith('http://localhost/api/endpoint/', {
            body: JSON.stringify([
                { method: 'patch', path: ['some', 5], data: { name: 'test namenew value' } },
            ]),
            headers: { 'Content-Type': 'application/json' },
            method: 'put',
        });
    });
});
