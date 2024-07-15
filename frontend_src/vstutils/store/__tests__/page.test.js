import { ref } from 'vue';
import { waitFor } from '@testing-library/dom';
import { expectNthRequest, createApp, createSchema } from '@/unittests';
import { useSelection } from '../helpers';
import pageSchema from './page-schema.json';

test('createListViewStore', async () => {
    // Created schema and Model
    const app = await createApp({
        schema: createSchema(pageSchema),
    });

    fetchMock.mockResponseOnce(
        JSON.stringify([{ status: 200, data: { count: 0, next: null, previous: null, results: [] } }]),
    );
    app.router.push('/some_list/');

    expect(app.store.page.response).toBeFalsy();

    await waitFor(() => expect(fetchMock).toBeCalledTimes(1));

    expect(app.store.page.response).toBeTruthy();
    expect(app.store.page.loading).toBeFalsy();
    expect(app.store.page.instances.length).toBe(0);

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
    await app.store.page.fetchData();

    expect(app.store.page.instances.length).toBe(3);
    expect(app.store.page.instances[0]._data).toStrictEqual({
        id: 5,
        store: 'LolShop',
        status: 'PAID',
        is_refund: false,
    });

    // Check that instance on listView is selected
    const selection = useSelection(ref(app.store.page.instances));
    selection.toggleSelection(5);
    expect(selection.selection.value).toStrictEqual([5]);
    selection.toggleSelection(5);

    // Check sublinks, actions and multiActions.
    expect(app.store.page.sublinks).toStrictEqual([]);
    // Actions must have filters action.
    expect(app.store.page.actions.length).toBe(1);
    expect(app.store.page.actions[0].name).toStrictEqual('filters');
    // MultiActions must have remove action.
    expect(app.store.page.multiActions.length).toBe(1);
    expect(app.store.page.multiActions[0].name).toStrictEqual('remove');

    // Check pagination
    expect(app.store.page.count).toBe(3);
    expect(app.store.page.pageNumber).toBe(1);

    // Check query params
    app.router.push('/some_list/?page=2');
    await app.store.page.fetchData();
    expect(app.store.page.filters).toStrictEqual({ page: '2' });

    fetchMock.resetMocks();
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
    app.router.push('/some_list/?id=3&name=MshShop');
    await waitFor(() => expect(fetchMock).toBeCalledTimes(1));
    expect(app.store.page.error).toBeFalsy();
    expect(app.store.page.instances.length).toBe(1);

    expectNthRequest(0, {
        method: 'PUT',
        url: 'http://localhost/api/endpoint/',
        body: [
            {
                method: 'get',
                path: ['some_list'],
                query: 'limit=20&offset=0&id=3&name=MshShop',
            },
        ],
    });

    // Check delete instance
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce('[{"status": 204}]');
    await app.store.page.removeInstance({
        instance: app.store.page.instances[0],
        fromList: true,
        purge: true,
    });
    expectNthRequest(0, {
        method: 'PUT',
        url: 'http://localhost/api/endpoint/',
        body: [
            {
                method: 'delete',
                path: ['some_list', 3],
                headers: {
                    'X-Purge-Nested': 'true',
                },
            },
        ],
    });

    // Check delete instances
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(data);
    await app.store.page.fetchData();

    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(
        JSON.stringify([
            { headers: '{}', status: 204 },
            { headers: '{}', status: 204 },
        ]),
    );
    await app.store.page.removeInstances({
        instances: [app.store.page.instances[0], app.store.page.instances[1]],
        purge: true,
    });
    expectNthRequest(0, {
        method: 'PUT',
        url: 'http://localhost/api/endpoint/',
        body: [
            {
                method: 'delete',
                path: ['some_list', 5],
                headers: {
                    'X-Purge-Nested': 'true',
                },
            },
            {
                method: 'delete',
                path: ['some_list', 2],
                headers: {
                    'X-Purge-Nested': 'true',
                },
            },
        ],
    });
});
