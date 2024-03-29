import { test, expect, beforeAll, beforeEach } from '@jest/globals';
import fetchMock from 'jest-fetch-mock';
import moment from 'moment';
import { createApp } from '@/unittests/create-app';
import { createSchema } from '@/unittests/schema';
import detailPageSchema from './detailPage-schema.json';
import putDetailPageSchema from './putDetailPage-schema.json';

beforeAll(() => {
    fetchMock.enableMocks();
    moment.tz.guess = () => 'UTC';
});

beforeEach(() => {
    fetchMock.resetMocks();
});

test('createDetailViewStore', async () => {
    // Created schema and Model
    const app = await createApp({
        schema: createSchema(detailPageSchema),
    });

    const detailView = app.views.get('/some_list/{id}/');

    // Create store for detailView
    const store = detailView._createStore();
    expect(store).not.toBeNull();

    // Push our path to router
    app.router.push('/some_list/15/');
    app.store.setPage(store);

    expect(store.response).toBeFalsy();

    // Mock response with empty results and make sure that response is received
    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                data: {
                    id: 15,
                    name: 'NewShop',
                    active: true,
                    phone: '79658964562',
                },
                status: 200,
            },
        ]),
    );
    await store.fetchData();

    expect(store.response).toBeTruthy();
    expect(store.loading).toBeFalsy();
    expect(store.instance._getInnerData()).toStrictEqual({
        id: 15,
        name: 'NewShop',
        active: true,
        phone: '79658964562',
    });

    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                data: {
                    id: 15,
                    name: 'Shop',
                    active: true,
                    phone: '79658964562',
                    some_number: 18,
                },
                status: 200,
            },
        ]),
    );
    await store.fetchData();

    let [, request] = fetchMock.mock.calls[0];
    let bulk = JSON.parse(request.body);
    expect(bulk[0].method).toBe('get');
    expect(bulk[0].path).toStrictEqual(['some_list', 15]);
    expect(bulk[0].query).toBeUndefined();

    // Check actions and sublinks
    expect(store.actions.length).toBe(1);
    expect(store.actions[0].name).toEqual('remove');

    expect(store.sublinks.length).toBe(1);
    expect(store.sublinks[0].name).toEqual('edit');

    fetchMock.resetMocks();
    fetchMock.mockResponseOnce('{}', { status: 204 });
    await store.removeInstance({ instance: store.instance, fromList: false, purge: false });
    [, request] = fetchMock.mock.calls[0];
    bulk = JSON.parse(request.body);
    expect(bulk[0].method).toBe('delete');
    expect(bulk[0].path).toStrictEqual(['some_list', 15]);
});

test('createEditViewStore', async () => {
    const app = await createApp({
        schema: createSchema(detailPageSchema),
    });

    const editView = app.views.get('/some_list/{id}/edit/');

    const store = editView._createStore();
    expect(store).not.toBeNull();

    // Push our path to router
    await app.router.push('/some_list/16/edit');
    await app.store.setPage(store);

    expect(store.response).toBeFalsy();

    // Mock response with empty results and make sure that response is received
    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                data: {
                    id: 15,
                    name: 'NewShop',
                    active: true,
                    phone: '79658964562',
                },
                status: 200,
            },
        ]),
    );
    await store.fetchData();

    expect(store.response).toBeTruthy();
    expect(store.loading).toBeFalsy();
    expect(store.instance._data).toStrictEqual({
        id: 15,
        name: 'NewShop',
        active: true,
        phone: '79658964562',
    });

    expect(store.actions.length).toBe(3);
    expect(store.actions[0].name).toEqual('save');
    expect(store.actions[1].name).toEqual('reload');
    expect(store.actions[2].name).toEqual('cancel');

    fetchMock.resetMocks();

    // Change field value
    store.setFieldValue({ field: 'name', value: 'new name' });

    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                data: { id: 15, name: 'NewShop', active: true, phone: '79658964562' },
                status: 200,
            },
        ]),
    );
    await store.reload();
    let [, request] = fetchMock.mock.calls[0];
    let bulk = JSON.parse(request.body);
    expect(bulk[0].method).toBe('get');
    expect(bulk[0].path).toStrictEqual(['some_list', 15]);
    // Field must be reset after reloading
    expect(store.sandbox.name).toBe('NewShop');
});

test('patchEditViewStore', async () => {
    const app = await createApp({
        schema: createSchema(detailPageSchema),
    });

    const editView = app.views.get('/some_list/{id}/edit/');

    const store = editView._createStore();
    await app.router.push('/some_list/17/edit');
    await app.store.setPage(store);

    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                data: {
                    id: 15,
                    name: 'NewShop',
                    active: true,
                    phone: '79658964562',
                },
                status: 200,
            },
        ]),
    );
    await store.fetchData();

    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                data: {
                    id: 15,
                    name: 'Shop',
                    active: true,
                    phone: '79658964562',
                },
                status: 200,
            },
        ]),
    );

    store.setFieldValue({ field: 'name', value: 'Shop' });
    expect(store.sandbox.name).toEqual('Shop');
    await store.save();

    // Check request
    let [, request] = fetchMock.mock.calls[0];
    let bulk = JSON.parse(request.body);
    expect(bulk[0].method).toBe('patch');
    expect(bulk[0].path).toStrictEqual(['some_list', 15]);
    expect(bulk[0].data).toStrictEqual({ name: 'Shop' });
});

test('putEditViewStore', async () => {
    const app = await createApp({
        schema: createSchema(putDetailPageSchema),
    });

    const editView = app.views.get('/some_list/{id}/edit/');

    const store = editView._createStore();
    await app.router.push('/some_list/15/edit');
    await app.store.setPage(store);

    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                data: {
                    id: 15,
                    name: 'NewShop',
                    active: true,
                    phone: '79658964562',
                },
                status: 200,
            },
        ]),
    );
    await store.fetchData();

    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                data: {
                    id: 15,
                    name: 'Shop',
                    active: true,
                    phone: '79658964562',
                },
                status: 200,
            },
        ]),
    );

    store.setFieldValue({ field: 'name', value: 'Shop' });
    expect(store.sandbox.name).toEqual('Shop');
    await store.save();

    let [, request] = fetchMock.mock.calls[0];
    let bulk = JSON.parse(request.body);
    expect(bulk[0].method).toBe('put');
    expect(bulk[0].path).toStrictEqual(['some_list', 15]);
    expect(bulk[0].data).toStrictEqual({
        name: 'Shop',
        phone: '79658964562',
    });
});

test('createNewViewStore', async () => {
    const app = await createApp({
        schema: createSchema(detailPageSchema),
    });

    const newView = app.views.get('/some_list/new/');
    const store = newView._createStore();
    expect(store).not.toBeNull();
    expect(store.model.name).toEqual('OneSomePage');

    await app.router.push('/some_list/new/');
    await app.store.setPage(store);
    expect(store.response).toBeFalsy();

    expect(store.sandbox).toStrictEqual({});
    await store.fetchData();
    expect(store.sandbox).toStrictEqual({
        active: false,
        id: undefined,
        name: undefined,
        phone: '78005553535',
    });

    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                data: {
                    id: 1,
                    name: 'Shop',
                    active: true,
                    phone: '79586545544',
                },
                status: 201,
            },
        ]),
    );

    store.setFieldValue({ field: 'name', value: 'Shop' });
    store.setFieldValue({ field: 'active', value: true });
    store.setFieldValue({ field: 'phone', value: '79586545544' });
    expect(store.sandbox.active).toEqual(true);
    expect(store.sandbox.name).toEqual('Shop');
    expect(store.sandbox.phone).toEqual('79586545544');
    await store.save();

    let [, request] = fetchMock.mock.calls[0];
    let bulk = JSON.parse(request.body);
    expect(bulk[0].method).toBe('post');
    expect(bulk[0].path).toStrictEqual(['some_list']);
    expect(bulk[0].data).toStrictEqual({ active: true, name: 'Shop', phone: '79586545544' });
});
