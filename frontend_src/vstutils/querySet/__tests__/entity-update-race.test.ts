import { createApp, createSchema, expectRequest, fetchMockCallAt, waitForPageLoading } from '#unittests';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import { getApp } from '#vstutils/utils';
import { useViewStore } from '#vstutils/store';
import type { PageEditView } from '#vstutils/views';

beforeAll(async () => {
    await createApp({ schema: createSchema() });
});

test('entity update race', async () => {
    const app = getApp();
    const confirm = vitest.spyOn(globalThis, 'confirm');

    fetchMock.mockResponse(
        JSON.stringify([
            {
                status: 200,
                path: '/user/1/',
                data: {
                    id: 1,
                    username: 'admin',
                    is_active: true,
                },
                headers: {
                    ETag: 'W/"value"',
                },
            },
        ]),
    );

    await app.router.push('/user/1/edit/');
    await waitForPageLoading();

    const store = useViewStore<PageEditView>();

    expect(store.instance!._response!.headers.ETag).toBe('W/"value"');

    // Change value
    store.setFieldValue({ field: 'username', value: 'new value' });

    // Return 412 (Precondition Failed)
    fetchMock.resetMocks();
    fetchMock.mockResponse(JSON.stringify([{ status: 412, path: '/user/1/', data: {} }]));

    // Do not override data
    confirm.mockReturnValue(false);
    fireEvent.click(screen.getByTitle('Save'));
    await waitForPageLoading();
    expect(fetchMock).toBeCalledTimes(1);
    await expectRequest(fetchMockCallAt(0), {
        url: 'http://localhost/api/endpoint/',
        body: JSON.stringify([
            {
                method: 'patch',
                path: ['user', 1],
                headers: { 'If-Match': 'W/"value"' },
                data: { username: 'new value' },
            },
        ]),
        headers: { 'Content-Type': 'application/json' },
        method: 'put',
    });
    expect(confirm).toBeCalledTimes(1);
    expect(confirm).toBeCalledWith('The data has been changed on the server. Do you want to overwrite it?');
    expect(app.router.currentRoute.path).toBe('/user/1/edit/'); // Page did not changed
    expect(store.sandbox.username).toBe('new value'); // Changed value did not reset

    fetchMock.resetMocks();
    confirm.mockReset();

    // Override data
    fetchMock.mockResponses(
        JSON.stringify([{ status: 412, path: '/user/1/', data: {} }]),
        JSON.stringify([{ status: 200, path: '/user/1/', data: { id: 1, username: 'new value' } }]),
    );
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByTitle('Save'));
    await waitForPageLoading();
    await waitFor(() => expect(fetchMock).toBeCalledTimes(2));
    await expectRequest(fetchMockCallAt(0), {
        url: 'http://localhost/api/endpoint/',
        body: JSON.stringify([
            {
                method: 'patch',
                path: ['user', 1],
                headers: { 'If-Match': 'W/"value"' },
                data: { username: 'new value' },
            },
        ]),
        headers: { 'Content-Type': 'application/json' },
        method: 'put',
    });
    await expectRequest(fetchMockCallAt(1), {
        url: 'http://localhost/api/endpoint/',
        body: JSON.stringify([
            {
                method: 'patch',
                path: ['user', 1],
                data: { id: 1, username: 'new value', is_active: true },
            },
        ]),
        headers: { 'Content-Type': 'application/json' },
        method: 'put',
    });
    expect(app.router.currentRoute.path).toBe('/user/1'); // Redirect to detail page should happen
});
