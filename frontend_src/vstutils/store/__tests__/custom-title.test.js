import { test, expect } from '@jest/globals';
import { createApp, createSchema, openPage } from '@/unittests';
import detailPageSchema from './detailPage-schema.json';
import fetchMock from 'jest-fetch-mock';

test('title customization using View.getTitle', async () => {
    fetchMock.enableMocks();

    // Created schema and Model
    const app = await createApp({
        schema: createSchema(detailPageSchema),
    });

    const userDetailView = app.views.get('/user/{id}/');

    userDetailView.getTitle = (state) => (state?.instance ? `User: ${state.instance.id}` : 'User');

    await openPage('/user/1337/');
    expect(app.store.title).toBe('User');

    fetchMock.mockResponseOnce(JSON.stringify([{ status: 200, data: { id: 1337, username: 'Msh' } }]));
    await app.store.page.fetchData();

    expect(app.store.title).toBe('User: 1337');
    expect(app.store.breadcrumbs.at(-1).name).toBe('User: 1337');
}, 9999);
