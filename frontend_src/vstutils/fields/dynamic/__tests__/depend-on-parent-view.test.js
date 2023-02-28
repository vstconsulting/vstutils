import { beforeAll, expect, test } from '@jest/globals';
import schema from './depend-on-parent-view-schema.json';
import fetchMock from 'jest-fetch-mock';
import { createApp } from '@/unittests/create-app';
import { createSchema } from '@/unittests/schema';
import { PhoneField } from '@/vstutils/fields/text/phone';
import { ColorField } from '@/vstutils/fields/color';

beforeAll(() => {
    fetchMock.enableMocks();
});

test('DynamicField depending on value from parent view', async () => {
    const app = await createApp({ schema: createSchema(schema) });

    const view = app.views.get(
        '/level_0/{level_0_with_value_for_dynamic_id}/level_1/{level_1_with_value_for_dynamic_id}/level_2/{level_2_id}/with_dynamic/',
    );

    await app.router.push('/level_0/0/level_1/1/level_2/2/with_dynamic/');
    const store = view._createStore();

    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                status: 200,
                data: { id: 0, name: 'some 1', field_type: 'some_phone' },
            },
            {
                status: 200,
                data: { id: 1, name: 'root', field_type: { type: 'string', format: 'color' } },
            },
            {
                status: 200,
                data: { id: 2, name: 'root' },
            },
            {
                status: 200,
                data: {
                    count: 2,
                    next: null,
                    previous: null,
                    results: [
                        { id: 1, value: undefined },
                        { id: 2, value: undefined },
                    ],
                },
            },
        ]),
    );

    await Promise.all([app.store.setPage(store), store.fetchData()]);

    expect(fetchMock.mock.calls.length).toBe(1);
    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(body).toStrictEqual([
        {
            method: 'get',
            path: ['level_0', '0'],
        },
        {
            method: 'get',
            path: ['level_0', '0', 'level_1', '1'],
        },
        {
            method: 'get',
            path: ['level_0', '0', 'level_1', '1', 'level_2', '2'],
        },
        {
            method: 'get',
            path: ['level_0', '0', 'level_1', '1', 'level_2', '2', 'with_dynamic'],
            query: 'limit=20&offset=0',
        },
    ]);

    const dynamicFromParent = app.modelsResolver.get('WithDynamic').fields.get('dynamic_from_parent');
    expect(dynamicFromParent.getRealField({})).toBeInstanceOf(ColorField);

    const dynamicFromParentWithPath = app.modelsResolver
        .get('WithDynamic')
        .fields.get('dynamic_from_parent_with_path');
    expect(dynamicFromParentWithPath.getRealField({})).toBeInstanceOf(PhoneField);
});
