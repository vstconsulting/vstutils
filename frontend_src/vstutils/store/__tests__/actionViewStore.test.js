import { test, expect, beforeAll } from '@jest/globals';
import { createApp } from '../../../unittests/create-app';
import { createSchema } from '../../../unittests/schema';
import detailPageSchema from './detailPage-schema.json';
import { defineStore } from 'pinia';
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

    const actionView = app.views.get('/some_action/');
    expect(actionView).toBeInstanceOf(ActionView);

    // Create store for detailView
    const store = defineStore('action_store', actionView.getStoreDefinition())();
    expect(store).not.toBeNull();

    expect(store.response).toBeTruthy();
    expect(store.sandbox).toStrictEqual({
        id: undefined,
        city: undefined,
        name: 'Msh',
    });

    // Push our path to router
    app.router.push('/some_action/');

    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                data: {
                    id: 1,
                    city: 'Mshvill',
                    name: 'Msh',
                },
                status: 201,
            },
        ]),
    );

    store.setFieldValue({ field: 'city', value: 'Mshvill' });
    expect(store.sandbox.city).toEqual('Mshvill');
    await store.execute();

    // eslint-disable-next-line no-unused-vars
    let [_, request] = fetchMock.mock.calls[0];
    let bulk = JSON.parse(request.body);
    expect(bulk[0].method).toBe('post');
    expect(bulk[0].path).toStrictEqual('/some_action/');
    expect(bulk[0].data).toStrictEqual({ city: 'Mshvill', name: 'Msh' });
});
