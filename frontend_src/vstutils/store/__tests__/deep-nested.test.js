import { beforeAll, expect, test } from '@jest/globals';
import fetchMock from 'jest-fetch-mock';
import { createApp } from '@/unittests/create-app';
import { createSchema } from '@/unittests/schema';
import deepNestedSchema from './deep-nested-schema.json';

let app;

beforeAll(async () => {
    app = await createApp({
        schema: createSchema(deepNestedSchema),
    });
    fetchMock.enableMocks();
});

test('filtering of deep nested on root page', async () => {
    const view = app.views.get('/group/');
    const store = view._createStore();
    await app.router.push('/group/');
    await app.store.setPage(store);

    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                status: 200,
                data: {
                    count: 1,
                    next: null,
                    previous: null,
                    results: [{ id: 3, name: 'Group 1' }],
                },
            },
        ]),
    );
    await store.fetchData();

    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(new URLSearchParams(body[0].query).get('__deep_parent')).toBe('');
});
