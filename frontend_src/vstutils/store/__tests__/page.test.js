import { test, expect, beforeAll } from '@jest/globals';
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { createApp } from '../../../unittests/create-app';
import { createSchema } from '../../../unittests/schema';
import fetchMock from 'jest-fetch-mock';
import { useSelection } from '../helpers';
import pageSchema from './page-schema.json';

beforeAll(() => {
    fetchMock.enableMocks();
});

test('createListViewStore', async () => {
    // Created schema and Model
    const app = await createApp({
        schema: createSchema(pageSchema),
    });

    const listView = app.views.get('/some_list/');

    // Get store for view and make sure that store is created, and it isn't null
    const store = defineStore('some_store', listView.getStoreDefinition())();
    expect(store).not.toBeNull();

    // Push our path to router
    await app.router.push('/some_list/');
    await app.store.setPage(store);

    expect(store.response).toBeFalsy();

    // Mock response with empty results and make sure that response is received
    fetchMock.mockResponseOnce(
        JSON.stringify([{ status: 200, data: { count: 0, next: null, previous: null, results: [] } }]),
    );
    await store.fetchData();

    expect(store.response).toBeTruthy();
    expect(store.loading).toBeFalsy();
    expect(store.instances).toStrictEqual([]);

    const data = JSON.stringify([
        {
            status: 200,
            data: {
                count: 3,
                next: null,
                previous: null,
                results: [
                    {
                        id: 5,
                        store: 'LolShop',
                        status: 'PAID',
                        is_refund: false,
                    },
                    {
                        id: 2,
                        store: 'MshShop',
                        status: 'UNCONFIRMED',
                        is_refund: false,
                    },
                    {
                        id: 3,
                        store: 'MshShop',
                        status: 'READY',
                        is_refund: true,
                    },
                ],
            },
        },
    ]);

    // Mock response with results
    fetchMock.mockResponseOnce(data);
    await store.fetchData();

    expect(store.instances.length).toBe(3);
    expect(store.instances[0]._data).toStrictEqual({
        id: 5,
        store: 'LolShop',
        status: 'PAID',
        is_refund: false,
    });

    // Check that instance on listView is selected
    const selection = useSelection(ref(store.instances));
    selection.toggleSelection(5);
    expect(selection.selection.value).toStrictEqual([5]);
    selection.toggleSelection(5);

    // Check sublinks, actions and multiActions.
    expect(store.sublinks).toStrictEqual([]);
    // Actions must have filters action.
    expect(store.actions.length).toBe(1);
    expect(store.actions[0].name).toStrictEqual('filters');
    // MultiActions must have remove action.
    expect(store.multiActions.length).toBe(1);
    expect(store.multiActions[0].name).toStrictEqual('remove');

    // Check pagination
    expect(store.count).toBe(3);
    expect(store.pageNumber).toBe(1);

    // Check query params
    app.router.push('/some_list/?page=2');
    await store.fetchData();
    expect(store.filters).toStrictEqual({ page: '2' });

    fetchMock.resetMocks();
    app.router.push('/some_list/?id=3&name=MshShop');
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
                            id: 3,
                            store: 'MshShop',
                            status: 'READY',
                            is_refund: true,
                        },
                    ],
                },
            },
        ]),
    );
    await store.fetchData();
    expect(store.error).toBeFalsy();
    expect(store.instances.length).toBe(1);

    let [, request] = fetchMock.mock.calls[0];
    let bulk = JSON.parse(request.body);
    expect(bulk[0].method).toBe('get');
    expect(bulk[0].path).toStrictEqual(['some_list']);
    expect(bulk[0].query).toBe('limit=20&offset=0&id=3&name=MshShop');

    // Check delete instance
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce('{}', { status: 204 });
    await store.removeInstance({ instance: store.instances[0], fromList: true, purge: true });
    [, request] = fetchMock.mock.calls[0];
    bulk = JSON.parse(request.body);
    expect(bulk[0].method).toBe('delete');
    expect(bulk[0].path).toStrictEqual(['some_list', 3]);

    // Check delete instances
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(data);
    await store.fetchData();

    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(
        JSON.stringify([
            { headers: '{}', status: 204 },
            { headers: '{}', status: 204 },
        ]),
    );
    await store.removeInstances({ instances: [store.instances[0], store.instances[1]], purge: true });
    [, request] = fetchMock.mock.calls[0];
    bulk = JSON.parse(request.body);
    expect(bulk[0].method).toBe('delete');
    expect(bulk[0].path).toStrictEqual(['some_list', 5]);
    expect(bulk[1].path).toStrictEqual(['some_list', 2]);
});
