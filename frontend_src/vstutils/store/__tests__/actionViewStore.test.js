import { test, expect, beforeAll } from '@jest/globals';
import { createApp, createSchema, mountApp, waitForPageLoading } from '@/unittests';
import detailPageSchema from './detailPage-schema.json';
import { ActionView } from '../../views';
import fetchMock from 'jest-fetch-mock';

beforeAll(() => {
    fetchMock.enableMocks();
});

test('createActionViewStore', async () => {
    // Created schema and Model
    const app = await createApp({
        schema: createSchema(detailPageSchema),
    });
    await mountApp();

    const actionView = app.views.get('/some_list/some_action/');
    expect(actionView).toBeInstanceOf(ActionView);

    app.router.push('/some_list/some_action/');
    await waitForPageLoading();

    const store = app.store.page;
    expect(store).not.toBeNull();
    expect(store.response).toBeTruthy();
    expect(store.sandbox).toStrictEqual({
        bool: undefined,
        text: undefined,
        choice: 'one',
    });

    // No data entered (error should appear because 'text' field is required)
    {
        await store.execute();
        expect(fetchMock).toBeCalledTimes(0);
        expect(store.fieldsErrors.text).toBe('Field is empty.');
    }

    // Fill 'text' field (only this field should be sent)
    {
        store.setFieldValue({ field: 'text', value: 'Mshvill' });
        expect(store.sandbox.text).toEqual('Mshvill');

        fetchMock.mockResponseOnce(
            JSON.stringify([
                {
                    status: 201,
                    data: { bool: false, text: 'Mshvill', choice: 'one' },
                },
            ]),
        );
        await store.execute();
        expect(fetchMock).toBeCalledTimes(1);
        let [, request] = fetchMock.mock.calls[0];
        let bulk = JSON.parse(request.body);
        expect(bulk[0].method).toBe('post');
        expect(bulk[0].path).toStrictEqual('/some_list/some_action/');
        // expecting that 'choices' is sent too because it's required and has
        // enum, so the first value of this enum should be sent
        expect(bulk[0].data).toStrictEqual({ text: 'Mshvill', choice: 'one' });
    }
});
