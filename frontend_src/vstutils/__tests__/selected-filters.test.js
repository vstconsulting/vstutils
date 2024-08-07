import { createApp, createSchema, useTestCtx, waitForPageLoading } from '#unittests';

test('Selected filters', async () => {
    const app = await createApp({ schema: createSchema() });
    const { wrapper } = useTestCtx();

    fetchMock.mockResponseOnce(JSON.stringify([{ status: 200, data: { count: 0, results: [] } }]));
    await app.router.push('/user?id=1,2,3');
    await waitForPageLoading();

    const filters = wrapper.find('.selected-filters');

    expect(filters.text().replace(/\s/g, '')).toBe('Id:1,2,3×');
});
