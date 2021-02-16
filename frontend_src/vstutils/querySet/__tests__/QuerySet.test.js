import { expect, jest, test, describe } from '@jest/globals';
import { Model, ModelClass } from '../../models/Model.js';
import QuerySet from '../QuerySet.js';
import StringField from '../../fields/text/StringField.js';
import { IntegerField } from '../../fields/numbers/integer.js';
import { APIResponse, apiConnector } from '../../api';
import { RequestTypes } from '../../utils';
import { ListView, PageView } from '../../views';
import { QuerySetsResolver } from '../QuerySetsResolver';

jest.mock('../../api');

describe('QuerySet', () => {
    const idField = new IntegerField({ name: 'id', readOnly: true });
    const emailField = new StringField({ name: 'email' });
    const nameField = new StringField({ name: 'name' });

    @ModelClass()
    class User extends Model {
        static declaredFields = [idField, nameField];
    }

    @ModelClass()
    class OneUser extends Model {
        static declaredFields = [idField, emailField, nameField];
    }

    @ModelClass()
    class CreateUser extends Model {
        static declaredFields = [idField, emailField];
    }

    /**
     * @type {ModelsConfiguration}
     */
    const models = {
        [RequestTypes.LIST]: User,
        [RequestTypes.RETRIEVE]: OneUser,
        [RequestTypes.CREATE]: CreateUser,
    };

    test('get', async () => {
        const usersQueryset = new QuerySet('users', models);

        const usersData = [
            { id: 1, email: 'user1@users.omg', name: 'Name1' },
            { id: 2, email: 'user2@users.omg', name: 'SameName' },
            { id: 3, email: 'user3@users.omg', name: 'SameName' },
        ];

        // GET users?name=, GET users/1, GET users/2
        apiConnector._requestHandler = (request) => {
            expect(request.method).toBe('get');
            const url = request.path.join('/');
            if (url === 'users/1') {
                return new APIResponse(200, usersData[0]);
            } else if (url === 'users/2') {
                return new APIResponse(200, usersData[1]);
            } else if (url === 'users') {
                const nameFilter = request.query.name ? (u) => u.name === request.query.name : () => true;
                const users = usersData.filter(nameFilter);
                return new APIResponse(200, {
                    count: users.length,
                    next: null,
                    previous: null,
                    results: users,
                });
            } else {
                return new APIResponse(404);
            }
        };

        // Get one user
        const user1 = await usersQueryset.get(usersData[1].id);
        expect(user1).toBeInstanceOf(OneUser);
        expect(user1.id).toBe(usersData[1].id);
        expect(user1.email).toBe(usersData[1].email);
        expect(user1.name).toBe(usersData[1].name);

        try {
            await usersQueryset.get(1);
        } catch (error) {
            expect(error.status).toBe(404);
        }

        // Get one user using filter, without providing id

        apiConnector._bulkHandler = () => [
            { status: 200, data: { count: 1, next: null, previous: null, results: [usersData[0]] } },
            { status: 200, data: usersData[0] },
        ];

        const user2 = await usersQueryset.filter({ name: 'Name1' }).get();
        expect(user2).toBeInstanceOf(OneUser);
        expect(user2.id).toBe(usersData[0].id);
        expect(user2.email).toBe(usersData[0].email);
        expect(user2.name).toBe(usersData[0].name);

        // Get one user using empty filter, without providing id
        apiConnector._bulkHandler = () => [
            { status: 200, data: { count: 3, next: null, previous: null, results: usersData } },
            { status: 200, data: usersData[0] },
        ];
        try {
            expect(usersQueryset.query).toStrictEqual({});
            await usersQueryset.get();
        } catch (error) {
            expect(error.message).toBe('More then one entity found');
        }
    });

    test('items', async () => {
        const usersQueryset = new QuerySet('users', models);

        const usersData = [
            { id: 1, name: 'kek name' },
            { id: 2, name: 'vitya' },
            { id: 3, name: 'oleg' },
            { id: 4, name: 'vitya' },
        ];

        // Prepare request handler with filter
        apiConnector._requestHandler = (request) => {
            expect(request.method).toBe('get');
            expect(request.path).toStrictEqual(['users']);
            const nameFilter = request.query.name ? (u) => u.name === request.query.name : () => true;
            const users = usersData.filter(nameFilter);
            return new APIResponse(200, { count: users.length, next: null, previous: null, results: users });
        };

        // Request all users
        const users = await usersQueryset.items();
        expect(users.length).toBe(4);
        expect(users.total).toBe(4);
        expect(users.extra).toStrictEqual({ count: 4, next: null, previous: null });
        expect(users.map((u) => [u.id, u.name])).toStrictEqual(usersData.map((u) => [u.id, u.name]));

        // Get users with name 'vitya'
        const filteredQueryset = usersQueryset.filter({ name: 'vitya' });
        const vityas = await filteredQueryset.items();
        expect(vityas.length).toBe(2);
        expect(vityas.total).toBe(2);
        expect(vityas.extra).toStrictEqual({ count: 2, next: null, previous: null });
        expect(vityas.map((u) => [u.id, u.name])).toStrictEqual([
            [2, 'vitya'],
            [4, 'vitya'],
        ]);
    });

    test('clone', () => {
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

    test('create', async () => {
        apiConnector._requestHandler = function (request) {
            const url = request.path.join('/');

            if (request.method === 'post' && url === 'users') {
                this.savedUserEmail = request.data.email;
                return new APIResponse(201, { id: 1, email: this.savedUserEmail });
            } else if (request.method === 'get' && url === 'users/<<0[data][id]>>') {
                return new APIResponse(201, { id: 1, email: this.savedUserEmail, name: '' });
            }

            return new APIResponse(404);
        };
        apiConnector._bulkHandler = (reqs) => reqs.map((req) => apiConnector._requestHandler(req));

        const usersQs = new QuerySet('users', models);

        const user1 = new CreateUser({ email: 'user1@users.com' }, usersQs);
        const savedUser1 = await user1.save();
        expect(savedUser1).toBeInstanceOf(OneUser);
        expect(savedUser1.id).toBe(1);
        expect(savedUser1.email).toBe('user1@users.com');
    });

    test('update with different update/retrieve models', async () => {
        @ModelClass()
        class CreatePost extends Model {
            static declaredFields = [idField, nameField];
        }

        @ModelClass()
        class OnePost extends CreatePost {}

        const models = {
            [RequestTypes.CREATE]: CreatePost,
            [RequestTypes.RETRIEVE]: OnePost,
        };

        const postsQueryset = new QuerySet('posts', models);

        apiConnector._requestHandler = (request) => {
            const url = request.path.join('/');

            if (request.method === 'patch' && url === 'posts/3') {
                expect(request.data).toStrictEqual({ id: 3, name: 'Post 1' });
                return new APIResponse(200, request.data);
            } else if (request.method === 'get' && url === 'posts/3') {
                return new APIResponse(200, request.data);
            }

            return new APIResponse(404);
        };
        apiConnector._bulkHandler = (reqs) => reqs.map((req) => apiConnector._requestHandler(req));

        const post = new CreatePost({ id: 3, name: 'Post 1' }, postsQueryset);
        const savedPost = await post.save();
        expect(savedPost).toBeInstanceOf(OnePost);
    });

    test('update with same update/retrieve models', async () => {
        @ModelClass()
        class OnePost extends Model {
            static declaredFields = [idField, nameField];
        }

        const models = { [RequestTypes.RETRIEVE]: OnePost };

        const postsQueryset = new QuerySet('posts', models);

        apiConnector._requestHandler = (request) => {
            const url = request.path.join('/');

            if (request.method === 'patch' && url === 'posts/3') {
                expect(JSON.parse(request.data)).toStrictEqual({ id: 3, name: 'Post 1' });
                return new APIResponse(200, request.data);
            }

            return new APIResponse(404);
        };
        apiConnector._bulkHandler = (reqs) => reqs.map((req) => apiConnector._requestHandler(req));

        const post = new OnePost({ id: 3, name: 'Post 1' }, postsQueryset);
        const savedPost = await post.save();
        expect(savedPost).toBeInstanceOf(OnePost);
    });

    test('delete', async () => {
        @ModelClass()
        class OnePost extends Model {
            static declaredFields = [idField, nameField];
        }
        const models = { [RequestTypes.RETRIEVE]: OnePost };

        const postsQueryset = new QuerySet('posts', models);

        apiConnector._requestHandler = (request) => {
            expect(request.path).toStrictEqual(['posts', 4]);
            expect(request.method).toBe('delete');
            return new APIResponse(204);
        };
        apiConnector._bulkHandler = (reqs) => reqs.map((req) => apiConnector._requestHandler(req));

        const post = new OnePost({ id: 4, name: 'Post 4' }, postsQueryset);
        await post.delete();
    });
});

describe('QuerySetResolver test', () => {
    const idField = new IntegerField({ name: 'id', readOnly: true });
    @ModelClass()
    class Model1 extends Model {
        static declaredFields = [idField];
    }
    @ModelClass()
    class Model2 extends Model {
        static declaredFields = [idField];
    }
    @ModelClass()
    class Model3 extends Model {
        static declaredFields = [idField];
    }

    const models1 = { [RequestTypes.LIST]: Model1, [RequestTypes.RETRIEVE]: Model1 };
    const models2 = { [RequestTypes.LIST]: Model2, [RequestTypes.RETRIEVE]: Model2 };
    const models3 = { [RequestTypes.LIST]: Model3 };
    const qs1 = new QuerySet('path1', models1);
    const qs2 = new QuerySet('path2', models1);
    const qs3 = new QuerySet('path1/{id}/path1', models1);
    const qs4 = new QuerySet('path2/{id}/path2', models1);
    const qs5 = new QuerySet('path1/{id}/path1/{param}/nested', models1);
    const qs6 = new QuerySet('path2/{id}/path2/{param}/nested', models2);
    const qs7 = new QuerySet('path1/{id}/path3', models3);

    const level1_path1 = new ListView({ level: 1, path: '/path1/' }, qs1);
    const level1_path2 = new ListView({ level: 1, path: '/path2/' }, qs2);

    const level2_path1 = new PageView({ level: 2, path: '/path1/{id}/' }, qs1);
    const level2_path2 = new PageView({ level: 2, path: '/path2/{id}/' }, qs2);

    const level3_path1 = new ListView({ level: 3, path: '/path1/{id}/path1/' }, qs3);
    const level3_path2 = new ListView({ level: 3, path: '/path2/{id}/path2/' }, qs4);

    const level4_path1 = new PageView({ level: 4, path: '/path1/{id}/path1/{param}/' }, qs3);
    const level4_path2 = new PageView({ level: 4, path: '/path2/{id}/path2/{param}/' }, qs4);

    const level5_path1 = new ListView({ level: 5, path: '/path1/{id}/path1/{param}/nested/' }, qs5);
    const level5_path2 = new ListView({ level: 5, path: '/path2/{id}/path2/{param}/nested/' }, qs6);

    const level3_path3 = new ListView({ level: 3, path: 'path1/{id}/path3' }, qs7);
    const views = new Map(
        [
            level1_path1,
            level1_path2,
            level2_path1,
            level2_path2,
            level3_path1,
            level3_path2,
            level3_path3,
            level4_path1,
            level4_path2,
            level5_path1,
            level5_path2,
        ].map((view) => [view.path, view]),
    );
    const models = new Map([
        [Model1.name, Model1],
        [Model2.name, Model2],
        [Model3.name, Model3],
    ]);
    const resolver = new QuerySetsResolver(models, views);

    test('test nested queryset', () => {
        // test nested qs
        expect(resolver.findQuerySet('Model2', level3_path2.path)).toStrictEqual(qs6);
        // test parent qs
        expect(resolver.findQuerySet('Model1', level3_path2.path)).toStrictEqual(qs4);
        // test sibling qs
        expect(resolver.findQuerySet('Model3', level3_path2.path)).toStrictEqual(qs7);
        // test invalid model
        expect(() => {
            resolver.findQuerySet('Model4', level3_path2.path);
        }).toThrow();
    });
});
