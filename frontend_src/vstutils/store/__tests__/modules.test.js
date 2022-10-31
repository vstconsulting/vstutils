import { expect, test, describe, beforeAll } from '@jest/globals';
import { defineStore } from 'pinia';
import { createListViewStore } from '../page.ts';
import { createApp } from '../../../unittests/create-app';
import { createSchema } from '../../../unittests/schema';

describe('List store module', () => {
    let app;
    let store;

    beforeAll(async () => {
        app = await createApp({ schema: createSchema() });
        store = defineStore('LIST_STORE_MODULE', createListViewStore(app.views.get('/user/')))(app.pinta);
    });

    test('Set queryset', async () => {
        const qs = app.views.get('/user/').objects;

        store.setQuerySet(qs);
        store.setQuery({ username: 'testUser' });

        expect(store.queryset).not.toBe(qs);

        expect(qs.query).toStrictEqual({});
        expect(store.queryset.query).toStrictEqual({ username: 'testUser', limit: 20, offset: 0 });
    });
});
