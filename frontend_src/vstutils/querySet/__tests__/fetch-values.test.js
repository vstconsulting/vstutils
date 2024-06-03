import { waitFor } from '@testing-library/dom';
import { createApp, expectNthRequest } from '@/unittests';
import { fetchInstances } from '@/vstutils/fetch-values';
import { ArrayField } from '@/vstutils/fields/array';

let app;
let User;

beforeAll(async () => {
    app = await createApp();
    User = app.modelsResolver.byReferencePath('#/definitions/User');
    fetchMock.mockResponse(JSON.stringify([{ count: 0, results: [] }]));
    app.router.push('/user');
    await waitFor(() => expect(fetchMock).toBeCalledTimes(1));
});

beforeEach(() => {
    fetchMock.resetMocks();
});

const userFkField = {
    type: 'integer',
    format: 'fk',
    'x-options': {
        model: { $ref: '#/definitions/User' },
        value_field: 'id',
        view_field: 'username',
    },
};

test('disabled prefetch', async () => {
    const ModelWithFk = app.modelsResolver.bySchemaObject({
        properties: {
            id: { type: 'integer' },
            some_fk: {
                ...userFkField,
                'x-options': {
                    ...userFkField['x-options'],
                    usePrefetch: false,
                },
            },
        },
    });

    const instances = [new ModelWithFk({ id: 1, some_fk: 1 })];
    await fetchInstances(instances, { isPrefetch: true });

    expect(fetchMock).toBeCalledTimes(0);
});

test('fk fetching', async () => {
    const ModelWithFk = app.modelsResolver.bySchemaObject({
        properties: {
            id: { type: 'integer' },
            some_fk: userFkField,
        },
    });

    const instances = [
        new ModelWithFk({ id: 0, some_fk: 5 }),
        new ModelWithFk({ id: 1, some_fk: 3 }),
        new ModelWithFk({ id: 2, some_fk: 1 }),
        new ModelWithFk({ id: 3, some_fk: 1 }),
        new ModelWithFk({ id: 4, some_fk: null }),
        new ModelWithFk({ id: 5 }),
    ];

    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                status: 200,
                data: {
                    count: 3,
                    results: [
                        { id: 1, username: 'user1' },
                        { id: 5, username: 'user5' },
                    ],
                },
            },
        ]),
    );

    await fetchInstances(instances);

    expect(instances[0].some_fk).toBeInstanceOf(User);
    expect(instances[0].some_fk.username).toBe('user5');

    expect(instances[1].some_fk).toBeInstanceOf(User);
    expect(instances[1].some_fk.username).toBe('[Object not found]');

    expect(instances[2].some_fk).toBeInstanceOf(User);
    expect(instances[2].some_fk.username).toBe('user1');

    expect(instances[3].some_fk).toBeInstanceOf(User);
    expect(instances[3].some_fk.username).toBe('user1');

    expect(instances[4].some_fk).toBeNull();

    expect(instances[5].some_fk).toBeUndefined();

    expect(fetchMock).toBeCalledTimes(1);
    expectNthRequest(0, {
        body: [
            {
                method: 'get',
                path: ['user'],
                query: new URLSearchParams({ id: '5,3,1', limit: '3' }).toString(),
            },
        ],
    });
});

test('dynamic with fk fetching', async () => {
    const DynamicModel = app.modelsResolver.bySchemaObject({
        type: 'object',
        properties: {
            id: { type: 'integer' },
            field_type: { type: 'string' },
            dynamic: {
                type: 'integer',
                format: 'dynamic',
                'x-options': {
                    field: 'field_type',
                    types: {
                        user_foreign_key: userFkField,
                    },
                },
            },
        },
    });

    const instances = [
        new DynamicModel({
            id: 1,
            field_type: 'user_foreign_key',
            dynamic: 1337,
        }),
    ];

    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                status: 200,
                data: {
                    count: 1,
                    results: [{ id: 1337, username: 'user1337' }],
                },
            },
        ]),
    );

    await fetchInstances(instances);

    expect(fetchMock).toBeCalledTimes(1);
    expectNthRequest(0, {
        body: [
            {
                method: 'get',
                path: ['user'],
                query: new URLSearchParams({ id: '1337', limit: '1' }).toString(),
            },
        ],
    });

    // Fk should become instances
    expect(instances[0].dynamic).toBeInstanceOf(User);
    expect(instances[0].dynamic.username).toBe('user1337');
});

test('related list with array with dynamic with fk fetching', async () => {
    const dynamicWithFk = {
        type: 'integer',
        format: 'dynamic',
        'x-options': {
            field: 'field_type',
            types: {
                simple_integer: { type: 'integer' },
                user_foreign_key: userFkField,
            },
        },
    };
    const ModelWithRelatedList = app.modelsResolver.bySchemaObject({
        properties: {
            id: { type: 'integer' },
            related_list: {
                type: 'array',
                format: 'table',
                items: {
                    type: 'object',
                    properties: {
                        field_type: { type: 'string' },
                        list: {
                            type: 'array',
                            items: dynamicWithFk,
                        },
                    },
                },
            },
        },
    });

    const instances = [
        new ModelWithRelatedList({
            id: 0,
            related_list: [
                { field_type: 'simple_integer', list: [1, 2, 3] },
                { field_type: 'user_foreign_key', list: [1001, 1000] },
            ],
        }),
        new ModelWithRelatedList({
            id: 1,
            related_list: [{ field_type: 'user_foreign_key', list: [1000] }],
        }),
    ];

    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                status: 200,
                data: {
                    count: 3,
                    results: [
                        { id: 1000, username: 'user1000' },
                        { id: 1001, username: 'user1001' },
                    ],
                },
            },
        ]),
    );

    await fetchInstances(instances);

    expect(fetchMock).toBeCalledTimes(1);
    expectNthRequest(0, {
        body: [
            {
                method: 'get',
                path: ['user'],
                query: new URLSearchParams({ id: '1001,1000', limit: '2' }).toString(),
            },
        ],
    });

    // Integers should not be changed
    expect(instances[0].related_list[0].list).toStrictEqual([1, 2, 3]);

    // Fk should become instances
    expect(instances[0].related_list[1].list[0]).toBeInstanceOf(User);
    expect(instances[0].related_list[1].list[0].username).toBe('user1001');
    expect(instances[0].related_list[1].list[1].username).toBe('user1000');
    expect(instances[1].related_list[0].list[0].username).toBe('user1000');

    // Check that model with array field was not changed
    expect(ModelWithRelatedList.fields.get('related_list').itemsModel.fields.get('list')).toBeInstanceOf(
        ArrayField,
    );
});

test('disabled prefetch inside an array field', async () => {
    const ModelFkInsideArray = app.modelsResolver.bySchemaObject({
        properties: {
            id: { type: 'integer' },
            array: {
                type: 'array',
                items: {
                    ...userFkField,
                    'x-options': {
                        ...userFkField['x-options'],
                        usePrefetch: false,
                    },
                },
            },
        },
    });

    fetchMock.mockResponseOnce(JSON.stringify([{ status: 200, data: { count: 0, results: [] } }]));

    await fetchInstances([new ModelFkInsideArray({ id: 1, array: [1, 2, 3] })], { isPrefetch: true });

    expect(fetchMock).toBeCalledTimes(0);
});
