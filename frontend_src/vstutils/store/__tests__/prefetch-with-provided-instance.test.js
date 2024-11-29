import { createApp } from '#unittests/create-app';
import { createSchema, expectNthRequest, waitFor } from '#unittests';
import schema from './prefetch-with-provided-instance-schema.json';

test('prefetch with provided instance', async () => {
    const app = await createApp({ schema: createSchema(schema) });
    const view = app.views.get('/some/{id}/');

    const Some = app.modelsResolver.get('Some');
    const providedInstance = new Some({ id: 123, name: 'test', related: 456 }, view.objects);

    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                status: 200,
                data: {
                    count: 1,
                    next: null,
                    previous: null,
                    results: [
                        {
                            id: 456,
                            name: 'related object',
                        },
                    ],
                },
            },
        ]),
    );

    app.router.push({ name: '/some/{id}/', params: { id: 123, providedInstance } });

    // Expected 1 request to prefetch related object with id 456
    await waitFor(() => expect(fetchMock.mock.calls.length).toBe(1));
    await expectNthRequest(0, {
        body: [
            {
                method: 'get',
                path: ['related'],
                query: 'id=456&limit=1',
            },
        ],
    });
    expect(app.store.page.sandbox.related).toBeInstanceOf(app.modelsResolver.get('Related'));
    expect(app.store.page.sandbox.related.name).toBe('related object');
});
