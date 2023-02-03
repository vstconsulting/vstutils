import { test, expect, beforeAll, beforeEach } from '@jest/globals';
import fetchMock from 'jest-fetch-mock';
import { createApp } from '@/unittests/create-app';
import { createSchema } from '@/unittests/schema';
import schema from './detailPageFilters-schema.json';

beforeAll(() => {
    fetchMock.enableMocks();
});

beforeEach(() => {
    fetchMock.resetMocks();
});

test('detail page filters', async () => {
    const app = await createApp({ schema: createSchema(schema) });
    const view = app.views.get('/page/{id}/');
    const store = view._createStore();

    app.router.push('/page/1/');
    app.store.setPage(store);

    fetchMock.mockResponseOnce(
        JSON.stringify([
            {
                status: 200,
                data: {
                    id: 1,
                    name: 'name',
                },
                headers: {
                    'X-Query-Data': 'date_filter=2001-11-01&boolean_filter=false',
                },
            },
        ]),
    );
    await store.fetchData();

    expect(store.instance._getInnerData()).toStrictEqual({
        id: 1,
        name: 'name',
    });
    expect(Object.keys(store.filters).length).toStrictEqual(2);
    expect(store.appliedDefaultFilterNames).toStrictEqual(['date_filter', 'boolean_filter']);
    expect(store.filtersQuery).toStrictEqual({});
    expect(store.filters).toStrictEqual({ date_filter: '2001-11-01', boolean_filter: 'false' });

    store.applyFilters({ string_filter: 'string', boolean_filter: true, date_filter: '2001-11-01' });
    await store.fetchData();

    expect(store.appliedDefaultFilterNames).toStrictEqual([]);

    let expectedInner = { string_filter: 'string', boolean_filter: 'true', date_filter: '2001-11-01' };
    expect(store.filtersQuery).toStrictEqual(expectedInner);
    expect(store.filters).toStrictEqual(expectedInner);
});
