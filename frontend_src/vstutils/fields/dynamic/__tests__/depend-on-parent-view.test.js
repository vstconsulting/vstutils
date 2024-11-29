import { waitFor } from '@testing-library/dom';
import { expectNthRequest, createApp, createSchema } from '#unittests';
import { PhoneField } from '#vstutils/fields/text/phone';
import { ColorField } from '#vstutils/fields/color';
import schema from './depend-on-parent-view-schema.json';

test('DynamicField depending on value from parent view', async () => {
    const app = await createApp({ schema: createSchema(schema) });

    fetchMock.mockResponses(
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
        ]),
        JSON.stringify([
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
    await app.router.push('/level_0/0/level_1/1/level_2/2/with_dynamic/');
    await waitFor(() => expect(fetchMock.mock.calls.length).toBe(2));

    await expectNthRequest(0, {
        method: 'PUT',
        url: 'http://localhost/api/endpoint/',
        body: [
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
        ],
    });
    await expectNthRequest(1, {
        method: 'PUT',
        url: 'http://localhost/api/endpoint/',
        body: [
            {
                method: 'get',
                path: ['level_0', '0', 'level_1', '1', 'level_2', '2', 'with_dynamic'],
                query: 'limit=20&offset=0',
            },
        ],
    });

    const dynamicFromParent = app.modelsResolver.get('WithDynamic').fields.get('dynamic_from_parent');
    expect(dynamicFromParent.getRealField({})).toBeInstanceOf(ColorField);

    const dynamicFromParentWithPath = app.modelsResolver
        .get('WithDynamic')
        .fields.get('dynamic_from_parent_with_path');
    expect(dynamicFromParentWithPath.getRealField({})).toBeInstanceOf(PhoneField);
});
