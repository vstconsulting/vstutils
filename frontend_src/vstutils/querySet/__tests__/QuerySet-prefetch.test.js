import { RequestTypes } from '@/vstutils/utils';
import { createApp } from '@/unittests';
import { QuerySet } from '../QuerySet';

describe('QuerySet prefetch', () => {
    let app;
    let User;

    beforeAll(async () => {
        app = await createApp();
        User = app.modelsResolver.byReferencePath('#/definitions/User');
        User.nonBulkMethods = ['get'];
    });

    beforeEach(() => {
        fetchMock.resetMocks();
    });

    function createQs(prefetch) {
        const SomeModel = app.modelsResolver.bySchemaObject({
            properties: {
                id: { type: 'integer' },
                user: {
                    type: 'integer',
                    format: 'fk',
                    'x-options': {
                        value_field: 'id',
                        view_field: 'username',
                        usePrefetch: prefetch,
                        model: { $ref: '#/definitions/User' },
                    },
                },
            },
        });
        SomeModel.nonBulkMethods = ['get'];
        return new QuerySet('/some_path/', { [RequestTypes.LIST]: [null, SomeModel] });
    }

    const usersResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [{ id: 1, user: 5 }],
    };

    test('enabled', async () => {
        const qsWithPrefetch = createQs(true);

        fetchMock.mockResponses(
            JSON.stringify(usersResponse),
            JSON.stringify({
                count: 1,
                next: null,
                previous: null,
                results: [{ id: 5, username: 'user5' }],
            }),
        );

        const instances = await qsWithPrefetch.items();

        expect(fetchMock).toBeCalledTimes(2);
        expect(instances[0].user).toBeInstanceOf(User);
    });

    test('disabled', async () => {
        const qsWithoutPrefetch = createQs(false);

        fetchMock.mockResponseOnce(JSON.stringify(usersResponse));

        const instances = await qsWithoutPrefetch.items();

        expect(fetchMock).toBeCalledTimes(1);
        expect(instances[0].user).toBe(5);
    });
});
