import moment from 'moment';
import {
    createApp,
    createSchema,
    expectRequest,
    fetchMockCallAt,
    waitFor,
    waitForPageLoading,
} from '@/unittests';
import detailPageSchema from './detailPage-schema.json';
import putDetailPageSchema from './putDetailPage-schema.json';

beforeAll(() => {
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

    // Push our path to router
    await app.router.push('/some_list/15/');
    await waitForPageLoading();

    expectRequest(fetchMockCallAt(0), {
        body: [{ method: 'get', path: ['some_list', '15'] }],
    });

    expect(app.store.page.response).toBeTruthy();
    expect(app.store.page.loading).toBeFalsy();
    expect(app.store.page.instance._getInnerData()).toStrictEqual({
        id: 15,
        name: 'NewShop',
        active: true,
        phone: '79658964562',
    });

    // Check actions and sublinks
    expect(app.store.page.actions.length).toBe(1);
    expect(app.store.page.actions[0].name).toEqual('remove');

    expect(app.store.page.sublinks.length).toBe(1);
    expect(app.store.page.sublinks[0].name).toEqual('edit');

    fetchMock.resetMocks();
    fetchMock.mockResponseOnce('{}', { status: 204 });
    await app.store.page.removeInstance({ instance: app.store.page.instance, fromList: false, purge: false });
    expectRequest(fetchMockCallAt(0), {
        body: [{ method: 'delete', path: ['some_list', 15] }],
    });
});

test('createEditViewStore', async () => {
    const app = await createApp({
        schema: createSchema(detailPageSchema),
    });

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
    await app.router.push('/some_list/16/edit');
    await waitForPageLoading();

    expect(app.store.page.response).toBeTruthy();
    expect(app.store.page.loading).toBeFalsy();
    expect(app.store.page.instance._data).toStrictEqual({
        id: 15,
        name: 'NewShop',
        active: true,
        phone: '79658964562',
    });

    expect(app.store.page.actions.length).toBe(3);
    expect(app.store.page.actions[0].name).toEqual('save');
    expect(app.store.page.actions[1].name).toEqual('reload');
    expect(app.store.page.actions[2].name).toEqual('cancel');

    fetchMock.resetMocks();

    // Change field value
    app.store.page.setFieldValue({ field: 'name', value: 'new name' });

    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                data: { id: 15, name: 'NewShop', active: true, phone: '79658964562' },
                status: 200,
            },
        ]),
    );
    await app.store.page.reload();

    await waitFor(() => expect(fetchMock.mock.calls.length).toBe(1));
    expectRequest(fetchMockCallAt(0), {
        body: [{ method: 'get', path: ['some_list', 15] }],
    });
    expect(app.store.page.sandbox.name).toBe('NewShop');
});

test('patchEditViewStore', async () => {
    const app = await createApp({
        schema: createSchema(detailPageSchema),
    });

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
    await app.router.push('/some_list/17/edit');
    await waitForPageLoading();

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

    app.store.page.setFieldValue({ field: 'name', value: 'Shop' });
    expect(app.store.page.sandbox.name).toEqual('Shop');
    await app.store.page.save();

    // Check request
    expectRequest(fetchMockCallAt(0), {
        body: [{ method: 'patch', path: ['some_list', 15], data: { name: 'Shop' } }],
    });
});

test('putEditViewStore', async () => {
    const app = await createApp({
        schema: createSchema(putDetailPageSchema),
    });

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

    await app.router.push('/some_list/15/edit');

    await waitForPageLoading();

    const store = app.store.page;

    store.setFieldValue({ field: 'name', value: 'Shop' });
    expect(store.sandbox.name).toEqual('Shop');
    await store.save();

    expectRequest(fetchMockCallAt(-1), {
        body: [
            { method: 'put', path: ['some_list', 15], data: { name: 'Shop', phone: '79658964562' } },
            { method: 'get', path: ['some_list', 15] },
        ],
    });
});

test('createNewViewStore', async () => {
    const app = await createApp({
        schema: createSchema(detailPageSchema),
    });

    await app.router.push('/some_list/new/');
    await waitForPageLoading();

    expect(app.store.page.sandbox).toStrictEqual({
        active: false,
        id: undefined,
        name: undefined,
        phone: '78005553535',
    });

    fetchMock.resetMocks();
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

    app.store.page.setFieldValue({ field: 'name', value: 'Shop' });
    app.store.page.setFieldValue({ field: 'active', value: true });
    app.store.page.setFieldValue({ field: 'phone', value: '79586545544' });
    expect(app.store.page.sandbox.active).toEqual(true);
    expect(app.store.page.sandbox.name).toEqual('Shop');
    expect(app.store.page.sandbox.phone).toEqual('79586545544');
    await app.store.page.save();

    expectRequest(fetchMockCallAt(0), {
        body: [
            {
                method: 'post',
                path: ['some_list'],
                data: { active: true, name: 'Shop', phone: '79586545544' },
            },
        ],
    });
});
