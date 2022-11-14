import { beforeAll, expect, test } from '@jest/globals';
import fetchMock from 'jest-fetch-mock';
import { defineStore } from 'pinia';
import { createApp } from '@/unittests/create-app';
import { createSchema } from '@/unittests/schema';
import schema from './prefetch-with-provided-instance-schema.json';

let app;

beforeAll(async () => {
    app = await createApp({ schema: createSchema(schema) });
    fetchMock.enableMocks();
});

test('prefetch with provided instance', async () => {
    const view = app.views.get('/some/{id}/');
    const store = defineStore('detail_store', view.getStoreDefinition())();

    const Some = app.modelsResolver.get('Some');
    const providedInstance = new Some({ id: 123, name: 'test', related: 456 }, view.objects);

    await app.router.push({ name: '/some/{id}/', params: { id: 123, providedInstance } });
    await app.store.setPage(store);

    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                status: 200,
                data: {
                    count: 1,
                    next: null,
                    previous: null,
                    results: [
                        {
                            id: 456,
                            name: 'related object',
                        },
                    ],
                },
            },
        ]),
    );
    await store.fetchData();

    // Expected 1 request to prefetch related object with id 456

    expect(fetchMock.mock.calls.length).toBe(1);
    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(body.length).toBe(1);
    expect(body[0].path).toStrictEqual(['related']);
    expect(body[0].query).toBe('id=456&limit=1');
    expect(store.sandbox.related).toBeInstanceOf(app.modelsResolver.get('Related'));
    expect(store.sandbox.related.name).toBe('related object');
});
