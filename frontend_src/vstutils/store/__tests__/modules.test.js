import { expect, test, describe, beforeAll } from '@jest/globals';
import { createApp, createSchema, openPage } from '@/unittests';

describe('List store module', () => {
    let app;

    beforeAll(async () => {
        app = await createApp({ schema: createSchema() });
    });

    test('Set queryset', async () => {
        await openPage('/user/');
        const store = app.store.page;
        const qs = app.views.get('/user/').objects;

        store.setQuerySet(qs);
        store.setQuery({ username: 'testUser' });

        expect(store.queryset).not.toBe(qs);

        expect(qs.query).toStrictEqual({});
        expect(store.queryset.query).toStrictEqual({ username: 'testUser', limit: 20, offset: 0 });
    });
});
