import { createApp, createSchema, schemaListOf } from '@/unittests';
import { getApp } from '@/vstutils/utils';

beforeAll(async () => {
    const some = {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } },
    };
    await createApp({
        // Only root view is hidden, expected that all children views will be hidden too
        schema: createSchema({
            paths: {
                '/hidden/': {
                    get: {
                        operationId: 'hidden_list',
                        'x-hidden': true,
                        responses: {
                            200: { schema: schemaListOf(some) },
                        },
                    },
                    post: {
                        operationId: 'hidden_add',
                        parameters: [{ name: 'body', in: 'body', required: true, schema: some }],
                        responses: {
                            201: { schema: some },
                        },
                    },
                },
                '/hidden/action/': {
                    post: {
                        operationId: 'hidden_action',
                        responses: {
                            200: { schema: { type: 'object' } },
                        },
                        parameters: [{ name: 'body', in: 'body', required: true, schema: some }],
                    },
                },
                '/hidden/{id}/': {
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    get: {
                        operationId: 'hidden_get',
                        responses: {
                            200: { schema: some },
                        },
                    },
                },
                '/hidden/{id}/nested/': {
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    get: {
                        operationId: 'hidden_nested_list',
                        responses: {
                            200: { schema: schemaListOf(some) },
                        },
                    },
                },
                '/hidden/{id}/nested/{nested_id}/': {
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                        { name: 'nested_id', in: 'path', required: true, schema: { type: 'integer' } },
                    ],
                    get: {
                        operationId: 'hidden_nested_get',
                        responses: {
                            200: { schema: some },
                        },
                    },
                },
                '/hidden/{id}/action/': {
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    post: {
                        operationId: 'hidden_id_action',
                        responses: {
                            200: { schema: { type: 'object' } },
                        },
                        parameters: [{ name: 'body', in: 'body', required: true, schema: some }],
                    },
                },
            },
        }),
    });
});

test('hidden views generation', () => {
    const { views } = getApp();

    expect(views.get('/hidden/').hidden).toBeTruthy();
    expect(views.get('/hidden/new/').hidden).toBeTruthy();
    expect(views.get('/hidden/action/').hidden).toBeTruthy();
    expect(views.get('/hidden/{id}/').hidden).toBeTruthy();
    expect(views.get('/hidden/{id}/action/').hidden).toBeTruthy();
    expect(views.get('/hidden/{id}/nested/').hidden).toBeTruthy();
    expect(views.get('/hidden/{id}/nested/{nested_id}/').hidden).toBeTruthy();
});
