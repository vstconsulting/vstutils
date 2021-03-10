import { beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import { IntegerField } from '../../fields/numbers/integer';
import { apiConnector } from '../../api';
import fetchMock from 'jest-fetch-mock';
import { Model, ModelClass } from '../../models';
import StringField from '../../fields/text/StringField';
import QuerySet from '../QuerySet';
import { RequestTypes } from '../../utils';

describe('QuerySet', () => {
    const idField = new IntegerField({ name: 'id', readOnly: true });
    const emailField = new StringField({ name: 'email' });
    const nameField = new StringField({ name: 'name' });

    beforeAll(() => {
        apiConnector.defaultVersion = 'v1';
        apiConnector.baseURL = 'http://localhost/api';
        fetchMock.enableMocks();
    });

    beforeEach(() => {
        fetchMock.resetMocks();
    });

    @ModelClass()
    class User extends Model {
        static declaredFields = [idField, emailField, nameField];
        static nonBulkMethods = ['get', 'post'];
    }

    @ModelClass()
    class OneUser extends Model {
        static declaredFields = [idField, emailField, nameField];
        static nonBulkMethods = ['get', 'patch', 'put', 'delete'];
    }

    @ModelClass()
    class CreateUser extends Model {
        static declaredFields = [idField, emailField, nameField];
        static nonBulkMethods = ['post'];
    }

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
        let [url, request] = fetchMock.mock.calls[0];
        expect(url).toBe('http://localhost/api/v1/users/');
        expect(request.method).toBe('get');
    });

    test('create', async () => {
        let data = JSON.stringify({ id: 1, name: 'test_name', email: 'test_mail' }, null, ' ');
        fetchMock.mockResponses(data, data);
        let user = await qs.create(new CreateUser({ name: 'test_name', email: 'test_mail' }));
        expect(user.id).toBe(1);
        expect(user.name).toBe('test_name');
        expect(user.email).toBe('test_mail');
        let [url, request] = fetchMock.mock.calls[0];
        expect(url).toBe('http://localhost/api/v1/users/');
        expect(request.method).toBe('post');
    });

    test('update', async () => {
        fetchMock.mockResponses('{"id": 2}');
        let [user] = await qs.update(new OneUser({ id: 2 }), [new User({ id: 2 })]);
        expect(user.id).toBe(2);
        let [url, request] = fetchMock.mock.calls[0];
        expect(url).toBe('http://localhost/api/v1/users/2/');
        expect(request.method).toBe('patch');
    });

    test('get by id', async () => {
        fetchMock.mockResponses('{"id": 1}');
        let user = await qs.get(1);
        expect(user.id).toBe(1);
        let [url, request] = fetchMock.mock.calls[0];
        expect(url).toBe('http://localhost/api/v1/users/1/');
        expect(request.method).toBe('get');
    });

    test('get first', async () => {
        fetchMock.mockResponses('{"count": 1, "results": [{"id": 4 }]}', '{"id": 4}');
        let user = await qs.get();
        expect(user.id).toBe(4);
    });

    test('delete', async () => {
        fetchMock.resetMocks();
        await qs.delete([new User({ id: 3 })]);
        let [url, request] = fetchMock.mock.calls[0];
        expect(url).toBe('http://localhost/api/v1/users/3/');
        expect(request.method).toBe('delete');
    });

    test('get one with error', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ count: 0, next: null, previous: null, results: [] }));
        try {
            await qs.getOne();
        } catch (StatusError) {
            expect(StatusError.message).toBe('Not Found');
        }

        fetchMock.mockResponseOnce(JSON.stringify({ count: 2, next: null, previous: null, results: [] }));
        try {
            await qs.getOne();
        } catch (StatusError) {
            expect(StatusError.message).toBe('More then one entity found');
        }
    });

    test('clone', () => {
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
    });

    test('items', async () => {
        const usersData = [
            { id: 1, name: 'kek name' },
            { id: 2, name: 'vitya' },
            { id: 3, name: 'oleg' },
            { id: 4, name: 'vitya' },
        ];

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
    });
});
