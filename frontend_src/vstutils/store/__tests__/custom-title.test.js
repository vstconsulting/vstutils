import { waitFor } from '@testing-library/dom';
import { createApp, createSchema } from '@/unittests';
import detailPageSchema from './detailPage-schema.json';

test('title customization using View.getTitle', async () => {
    // Created schema and Model
    const app = await createApp({
        schema: createSchema(detailPageSchema),
    });

    const userDetailView = app.views.get('/user/{id}/');

    userDetailView.getTitle = (state) => (state?.instance ? `User: ${state.instance.id}` : 'User');

    fetchMock.mockResponseOnce(JSON.stringify([{ status: 200, data: { id: 1337, username: 'Msh' } }]));
    await app.router.push('/user/1337/');
    expect(app.store.title).toBe('User');
    await waitFor(() => expect(app.store.title).toBe('User: 1337'));
    expect(app.store.breadcrumbs.at(-1).name).toBe('User: 1337');
});
