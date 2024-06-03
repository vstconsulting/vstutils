import { createApp } from '@/unittests/create-app';
import { createSchema } from '@/unittests/schema';
import deepNestedSchema from './deep-nested-schema.json';
import { waitFor } from '@testing-library/dom';

let app;

beforeAll(async () => {
    app = await createApp({
        schema: createSchema(deepNestedSchema),
    });
});

test('filtering of deep nested on root page', async () => {
    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                status: 200,
                data: {
                    count: 1,
                    next: null,
                    previous: null,
                    results: [{ id: 3, name: 'Group 1' }],
                },
            },
        ]),
    );
    await app.router.push('/group/');
    await waitFor(() => expect(fetchMock).toBeCalledTimes(1));
    const [request] = fetchMock.mock.calls[0];
    const body = JSON.parse(request.body.toString());
    expect(new URLSearchParams(body[0].query).get('__deep_parent')).toBe('');
});
