import { expect, test, beforeAll } from '@jest/globals';
import fetchMock from 'jest-fetch-mock';
import { createApp, createSchema, mountApp, waitForPageLoading } from '@/unittests';

let app;

beforeAll(async () => {
    app = await createApp({ schema: createSchema() });
    fetchMock.enableMocks();
});

test('Selected filters', async () => {
    const wrapper = await mountApp();

    fetchMock.mockResponseOnce(JSON.stringify([{ status: 200, data: { count: 0, results: [] } }]));
    await app.router.push('/user?id=1,2,3');
    await waitForPageLoading();

    const filters = wrapper.find('.selected-filters');

    expect(filters.text().replace(/\s/g, '')).toBe('Id:1,2,3×');
});
