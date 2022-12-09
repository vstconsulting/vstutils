import { test, expect, beforeAll, beforeEach } from '@jest/globals';
import fetchMock from 'jest-fetch-mock';
import moment from 'moment';
import { createApp } from '../../../unittests/create-app';
import { createSchema } from '../../../unittests/schema';
import detailPageSchema from './detailPage-schema.json';
import putDetailPageSchema from './putDetailPage-schema.json';
import { defineStore } from 'pinia';
import { DateTimeField } from '../../fields/datetime';
import { NumberField } from '../../fields/numbers';

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

    // Check filtersModelClass has been initiated
    expect(detailView.filtersModelClass).toBeTruthy();
    expect(detailView.filtersModelClass.fields.size).toBe(2);
    expect(detailView.filtersModelClass.fields.get('start_date')).toBeInstanceOf(DateTimeField);
    expect(detailView.filtersModelClass.fields.get('some_number')).toBeInstanceOf(NumberField);

    // Create store for detailView
    const store = defineStore('detail_store', detailView.getStoreDefinition())();
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
                    start_date: '2022-10-19',
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

    // Check initial filters
    expect(store.filters.start_date).toBeInstanceOf(moment);
    expect(store.filters.start_date.isSame(moment.tz('2022-10-19', 'UTC'))).toBeTruthy();
    expect(store.filters.some_number).toBe(undefined);

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
    // Check add new value to filter
    store.setFilterValue({ field: 'some_number', value: 18 });
    expect(store.filters.some_number).toBe(18);
    await store.applyFilters();
    await store.fetchData();

    let [, request] = fetchMock.mock.calls[0];
    let bulk = JSON.parse(request.body);
    expect(bulk[0].method).toBe('get');
    expect(bulk[0].path).toStrictEqual(['some_list', 15]);
    expect(bulk[0].query).toStrictEqual('start_date=2022-10-19T00%3A00%3A00Z&some_number=18');

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

    const store = defineStore('edit_store', editView.getStoreDefinition())();
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

    const store = defineStore('patch_store', editView.getStoreDefinition())();
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

    const store = defineStore('put_store', editView.getStoreDefinition())();
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
    const store = defineStore('new_store', newView.getStoreDefinition())();
    expect(store).not.toBeNull();
    expect(store.model.name).toEqual('OneSomePage');

    await app.router.push('/some_list/new/');
    await app.store.setPage(store);
    expect(store.response).toBeFalsy();

    expect(store.sandbox).toStrictEqual({});
    await store.fetchData();
    expect(store.sandbox).toStrictEqual({
        active: undefined,
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
