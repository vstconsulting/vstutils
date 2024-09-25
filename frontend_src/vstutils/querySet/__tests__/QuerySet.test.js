import { IntegerField } from '../../fields/numbers/integer';
import { apiConnector, APIResponse } from '../../api';
import { makeModel, BaseModel } from '../../models';
import StringField from '../../fields/text/StringField';
import { QuerySet } from '../QuerySet';
import { HttpMethods, RequestTypes } from '../../utils';
import { createApp, createSchema, expectNthRequest } from '#unittests';

describe('QuerySet', () => {
    const idField = new IntegerField({ name: 'id', readOnly: true });
    const emailField = new StringField({ name: 'email' });
    const nameField = new StringField({ name: 'name' });

    const usersData = [
        { id: 1, name: 'kek name' },
        { id: 2, name: 'vitya' },
        { id: 3, name: 'oleg' },
        { id: 4, name: 'vitya' },
    ];

    beforeAll(async () => {
        await createApp({ schema: createSchema({}) });
        apiConnector.defaultVersion = 'v1';
        apiConnector.baseURL = 'http://localhost/api';
        apiConnector.endpointURL = 'http://localhost/api/endpoint/';
    });

    beforeEach(() => {
        fetchMock.resetMocks();
    });

    const User = makeModel(
        class extends BaseModel {
            static declaredFields = [idField, emailField, nameField];
            static nonBulkMethods = ['get', 'post'];
        },
        'User',
    );

    const OneUser = makeModel(
        class extends BaseModel {
            static declaredFields = [idField, emailField, nameField];
            static nonBulkMethods = ['get', 'patch', 'put', 'delete'];
        },
        'OneUser',
    );

    const CreateUser = makeModel(
        class extends BaseModel {
            static declaredFields = [idField, emailField, nameField];
            static nonBulkMethods = ['post'];
        },
        'CreateUser',
    );

    const qs = new QuerySet('users', {
        [RequestTypes.LIST]: User,
        [RequestTypes.RETRIEVE]: OneUser,
        [RequestTypes.UPDATE]: OneUser,
        [RequestTypes.PARTIAL_UPDATE]: OneUser,
        [RequestTypes.CREATE]: CreateUser,
    });

    test('get list', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ count: 0, next: null, previous: null, results: [] }));
        expect((await qs.items()).length).toBe(0);
        expectNthRequest(0, { method: 'get', url: 'http://localhost/api/v1/users/' });
    });

    test('create', async () => {
        let data = JSON.stringify({ id: 1, name: 'test_name', email: 'test_mail' }, null, ' ');
        fetchMock.mockResponses(data, data);
        let user = await qs.create(new CreateUser({ name: 'test_name', email: 'test_mail' }));
        expect(user.id).toBe(1);
        expect(user.name).toBe('test_name');
        expect(user.email).toBe('test_mail');
        expectNthRequest(0, { method: 'post', url: 'http://localhost/api/v1/users/' });
    });

    test('create with invalid instance', async () => {
        let data = JSON.stringify({ id: 1, name: 'test_name', email: 'test_mail' }, null, ' ');
        fetchMock.mockResponses(data, data);

        const user = await new User({ name: 'test_name', email: 'test_mail' });
        await expect(qs.create(user)).rejects.toThrow(
            'Wrong model used. Expected: CreateUser. Actual: User.',
        );
    });

    test('update', async () => {
        fetchMock.mockResponses('{"id": 2}');
        let [user] = await qs.update(new OneUser({ id: 2 }), [new User({ id: 2 })]);
        expect(user.id).toBe(2);
        expectNthRequest(0, {
            method: 'patch',
            url: 'http://localhost/api/v1/users/2/',
        });
    });

    test('method "update" with instances == undefined returns updated model', async () => {
        fetchMock.mockResponses(
            JSON.stringify({ status: 200, results: [{ id: 2, email: null, name: 'User' }] }),
            '{"id": 2}',
        );
        let [user] = await qs.update(
            new OneUser({
                id: 2,
                email: null,
                name: 'New Name',
            }),
            undefined,
        );

        expect(user).toBeTruthy();
        expect(user.id).toBe(2);

        expectNthRequest(0, {
            method: 'get',
            url: 'http://localhost/api/v1/users/',
        });
        expectNthRequest(1, {
            method: 'patch',
            url: 'http://localhost/api/v1/users/2/',
        });
    });

    test('get by id', async () => {
        fetchMock.mockResponses('{"id": 1}');
        let user = await qs.get(1);
        expect(user.id).toBe(1);
        expectNthRequest(0, {
            method: 'get',
            url: 'http://localhost/api/v1/users/1/',
        });
    });

    test('get first', async () => {
        fetchMock.mockResponses('{"count": 1, "results": [{"id": 4 }]}', '{"id": 4}');
        let user = await qs.get();
        expect(user.id).toBe(4);
    });

    test('delete', async () => {
        fetchMock.resetMocks();
        fetchMock.mockResponseOnce('{}');
        await qs.delete([new User({ id: 3 })]);
        expectNthRequest(0, {
            method: 'delete',
            url: 'http://localhost/api/v1/users/3/',
        });
    });

    test('get one with error', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ count: 0, next: null, previous: null, results: [] }));
        await expect(qs.getOne()).rejects.toThrow('Not Found');

        fetchMock.mockResponseOnce(JSON.stringify({ count: 2, next: null, previous: null, results: [] }));
        await expect(qs.getOne()).rejects.toThrow('More then one entity found');
    });

    test('method "getOne" returns one instance', async () => {
        fetchMock.mockResponseOnce(
            JSON.stringify([
                {
                    status: 200,
                    data: { count: 1, next: null, previous: null, results: { id: 5, name: 'User 1' } },
                },
                {
                    status: 200,
                    data: { id: 5, name: 'User 1' },
                },
            ]),
        );
        OneUser.nonBulkMethods = [];
        const testInstance = await qs.getOne();
        expect(testInstance).toBeTruthy();
        expect(testInstance).toBeInstanceOf(OneUser);
        expect(testInstance._data).toEqual({ id: 5, name: 'User 1' });
    });

    test('method "getOne" returns first item', async () => {
        // Queryset with LIST model same us RETRIEVE model
        const qs1 = new QuerySet('users', {
            [RequestTypes.LIST]: User,
            [RequestTypes.RETRIEVE]: User,
        });
        fetchMock.mockResponse(
            JSON.stringify({
                count: 1,
                next: null,
                previous: null,
                results: [{ id: 3, name: 'User 3' }],
            }),
        );
        const testInstance = await qs1.getOne();
        expect(testInstance).toBeTruthy();
        expect(testInstance).toBeInstanceOf(User);
        expect(testInstance._data).toEqual({ id: 3, name: 'User 3' });
    });

    test('method "getOne" returns error if data count is 0 or more than 1', async () => {
        fetchMock.mockResponseOnce(
            JSON.stringify([
                {
                    status: 200,
                    data: {
                        count: 2,
                        next: null,
                        previous: null,
                        results: { id: 5, name: 'User 1' },
                    },
                },
                {
                    status: 500,
                    data: {},
                },
            ]),
        );

        await expect(qs.getOne()).rejects.toThrow('More then one entity found');

        fetchMock.mockResponseOnce(
            JSON.stringify([
                {
                    status: 200,
                    data: {
                        count: 0,
                        next: null,
                        previous: null,
                        results: { id: 5, name: 'User 1' },
                    },
                },
                {
                    status: 500,
                    data: {},
                },
            ]),
        );
        await expect(qs.getOne()).rejects.toThrow('No OneUser matches the given query.');
    });

    test('clone/copy/all', () => {
        const models = {
            [RequestTypes.LIST]: User,
            [RequestTypes.RETRIEVE]: OneUser,
            [RequestTypes.CREATE]: CreateUser,
        };
        // Simple clone
        const qs1 = new QuerySet('users', models);
        const qs2 = qs1.clone();

        expect(qs1).not.toBe(qs2);
        expect(qs1.query).not.toBe(qs2.query);
        expect(qs1.models).not.toBe(qs2.models);

        expect(qs2.query).toStrictEqual({});
        expect(qs2.models).toStrictEqual(models);
        expect(qs2.url).toBe('users');

        // Clone with parameters
        const qs3 = qs2.clone({ url: 'posts', query: { rating: 10 } });
        expect(qs2).not.toBe(qs3);
        expect(qs2.models).not.toBe(qs3.models);

        expect(qs2.url).toBe('users');
        expect(qs2.query).toStrictEqual({});

        expect(qs3.url).toBe('posts');
        expect(qs3.query).toStrictEqual({ rating: 10 });

        // Copy. Check cache
        qs1.cache = 'testCache';
        const qs4 = qs1.copy();
        expect(qs4.cache).toBe('testCache');

        // All. Check this.query
        qs1.query = { username: 'Nick' };
        const qs5 = qs1.all();
        expect(qs5.query).toStrictEqual({ username: 'Nick' });
    });

    test('items', async () => {
        // Request all users
        fetchMock.mockResponse(JSON.stringify({ count: 4, next: null, previous: null, results: usersData }));
        const users = await qs.items();
        expect(users.length).toBe(4);
        expect(users.total).toBe(4);
        expect(users.extra).toStrictEqual({ count: 4, next: null, previous: null });

        // Get users with name 'vitya'
        fetchMock.mockResponse(
            JSON.stringify({ count: 2, next: null, previous: null, results: [usersData[1], usersData[3]] }),
        );
        const filteredQueryset = qs.filter({ name: 'vitya' });
        expect(qs).not.toBe(filteredQueryset);
        const vityas = await filteredQueryset.items();
        expect(vityas.length).toBe(2);
        expect(vityas.total).toBe(2);
        expect(vityas.extra).toStrictEqual({ count: 2, next: null, previous: null });
        expect(vityas[1].name).toBe('vitya');

        // test cache
        qs.cache = 'testCache';
        const qsWithCache = await qs.items(false);
        expect(qsWithCache).toBe('testCache');
    });

    test('method "exclude" returns new queryset with "query" property', async () => {
        fetchMock.mockResponse(
            JSON.stringify({
                count: 4,
                next: null,
                previous: null,
                results: usersData,
            }),
        );
        const users = qs.exclude({ name: 'vitya' });
        expect(qs).not.toBe(users);
        expect(users.query).toEqual({ name__not: 'vitya' });
    });

    describe('bulk requests', () => {
        const User = makeModel(
            class extends BaseModel {
                static declaredFields = [idField, nameField];
            },
        );
        const OneUser = makeModel(
            class extends BaseModel {
                static declaredFields = [idField, emailField, nameField];
            },
        );
        const CreateUser = makeModel(
            class extends BaseModel {
                static declaredFields = [idField, nameField];
            },
        );
        const qs = new QuerySet('users', {
            [RequestTypes.LIST]: User,
            [RequestTypes.RETRIEVE]: OneUser,
            [RequestTypes.UPDATE]: CreateUser,
            [RequestTypes.PARTIAL_UPDATE]: CreateUser,
            [RequestTypes.CREATE]: CreateUser,
        });

        test('update/create/save/delete with normal response', async () => {
            const testData = [
                { status: 200, data: { id: 5, name: 'User 1' } },
                { status: 200, data: { id: 5, name: 'User 1', email: 'user@user.com' } },
            ];
            fetchMock.mockResponse(JSON.stringify(testData));

            // Save. Create
            const createdUser1 = await new CreateUser({ name: 'User 1' }, qs).save();
            expect(createdUser1).toBeInstanceOf(OneUser);
            expect(createdUser1._getInnerData()).toStrictEqual(testData[1].data);

            // Create
            const createdUser = await new CreateUser({ name: 'User 1' }, qs).create();
            expect(createdUser).toBeInstanceOf(OneUser);
            expect(createdUser._getInnerData()).toStrictEqual(testData[1].data);

            // Create with CREATE model same as RETRIEVE model queryset
            const qs1 = new QuerySet('users', {
                [RequestTypes.RETRIEVE]: CreateUser,
                [RequestTypes.CREATE]: CreateUser,
            });
            const createdUser2 = await new CreateUser({ name: 'User 1' }, qs1).create();
            expect(createdUser2).toBeTruthy();
            expect(createdUser2).toBeInstanceOf(CreateUser);
            expect(createdUser2._getInnerData()).toStrictEqual(testData[0].data);

            // Update
            const updatedUser = await new CreateUser(null, null, createdUser).update();
            expect(updatedUser).toBeInstanceOf(OneUser);
            expect(updatedUser._getInnerData()).toStrictEqual(testData[1].data);

            // Save. Update
            const savedUser = await new CreateUser({ email: 'new@mail.com' }, null, createdUser).save();
            expect(savedUser).toBeInstanceOf(OneUser);
            expect(savedUser._getInnerData()).toStrictEqual(testData[1].data);

            // Delete
            const deletedUser = await new CreateUser({}, null, createdUser).delete();
            expect(deletedUser.status).toBe(200);
        });

        test('update/create with error', async () => {
            const testData = { status: 400, data: { name: ['Error text'] } };
            fetchMock.mockResponse(JSON.stringify([testData, { status: 500, data: {} }]));

            // Create with error
            await expect(new CreateUser({ name: '' }, qs).create()).rejects.toMatchObject(testData);

            // Update with error
            const user = new CreateUser(null, null, new OneUser({ id: 3, email: '', name: 'User 2' }, qs));
            await expect(user.update()).rejects.toMatchObject(testData);
        });

        test('method "execute" returns APIResponse', async () => {
            const testData = [
                { status: 200, data: { id: 5, name: 'User 1' } },
                { status: 200, data: { id: 5, name: 'User 1', email: 'user@user.com' } },
            ];
            fetchMock.mockResponse(JSON.stringify(testData));
            const createdUser = await new CreateUser({ name: 'User 1' }, qs).create();
            const responseWithInstance = await qs.execute({
                data: createdUser,
                method: HttpMethods.GET,
                path: qs.getDataType(),
                query: qs.query,
            });
            expect(responseWithInstance.status).toBe(200);
            expect(responseWithInstance.data).toEqual({ id: 5, name: 'User 1' });
            expect(responseWithInstance).toBeInstanceOf(APIResponse);

            const responseWithObj = await qs.execute({
                data: { id: 5 },
                method: HttpMethods.GET,
                path: qs.getDataType(),
                query: qs.query,
            });
            expect(responseWithObj.status).toBe(200);
            expect(responseWithObj.data).toEqual({ id: 5, name: 'User 1' });
            expect(responseWithObj).toBeInstanceOf(APIResponse);
        });
    });

    test('url formatting', async () => {
        const qs = new QuerySet('/fragment1/{pk1}/fragment2/{pk2}/', { [RequestTypes.LIST]: User }, {}, [
            new StringField({ name: 'pk1' }),
            new StringField({ name: 'pk2' }),
        ]);

        const formatted = qs.clone({ pathParamsValues: { pk1: 2, pk2: 5 } });
        expect(qs).not.toBe(formatted);
        expect(formatted.url).toBe('/fragment1/2/fragment2/5/');
        expect(formatted.pathParams[0]).toBeInstanceOf(StringField);

        fetchMock.once(JSON.stringify({ count: 0, next: null, previous: null, results: [] }));
        const itemsRequest = qs.items(true, { pk1: 12, pk2: 15 }).then((items) => items.length);
        await expect(itemsRequest).resolves.toBe(0);
        expectNthRequest(0, { url: 'http://localhost/api/v1/fragment1/12/fragment2/15/' });

        fetchMock.once(JSON.stringify({ id: 1337 }));
        const itemRequest = qs.get(1337, { pk1: 9, pk2: 8 }).then((instance) => instance.id);
        await expect(itemRequest).resolves.toBe(1337);
        expectNthRequest(1, { url: 'http://localhost/api/v1/fragment1/9/fragment2/8/1337/' });
    });
});
