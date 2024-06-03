import { waitForPageLoading, createApp, createSchema } from '@/unittests';
import schema from './detailPageFilters-schema.json';

beforeEach(() => {
    fetchMock.resetMocks();
});

test('detail page filters', async () => {
    const app = await createApp({ schema: createSchema(schema) });

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
    await app.router.push('/page/1/');
    await waitForPageLoading();

    expect(app.store.page.instance._getInnerData()).toStrictEqual({
        id: 1,
        name: 'name',
    });
    expect(Object.keys(app.store.page.filters).length).toStrictEqual(2);
    expect(app.store.page.appliedDefaultFilterNames).toStrictEqual(['date_filter', 'boolean_filter']);
    expect(app.store.page.filtersQuery).toStrictEqual({});
    expect(app.store.page.filters).toStrictEqual({ date_filter: '2001-11-01', boolean_filter: 'false' });

    app.store.page.applyFilters({ string_filter: 'string', boolean_filter: true, date_filter: '2001-11-01' });
    await app.store.page.fetchData();

    expect(app.store.page.appliedDefaultFilterNames).toStrictEqual([]);

    let expectedInner = { string_filter: 'string', boolean_filter: 'true', date_filter: '2001-11-01' };
    expect(app.store.page.filtersQuery).toStrictEqual(expectedInner);
    expect(app.store.page.filters).toStrictEqual(expectedInner);
});
