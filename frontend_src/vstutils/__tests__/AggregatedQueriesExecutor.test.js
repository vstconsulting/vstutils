import { createSchema, createApp } from '#unittests';
import { makeModel, BaseModel } from '../models';
import { QuerySet } from '../querySet/QuerySet.ts';
import { StringField } from '../fields/text/';
import { IntegerField } from '../fields/numbers/integer';
import { RequestTypes } from '../utils';
import { AggregatedQueriesExecutor } from '../AggregatedQueriesExecutor.js';
import { NotFoundError } from '../querySet/errors.js';

describe('AggregatedQueriesExecutor', () => {
    beforeAll(async () => {
        await createApp({ schema: createSchema() });
    });

    beforeEach(() => {
        fetchMock.resetMocks();
    });

    const idField = new IntegerField({ name: 'id', readOnly: true });
    const nameField = new StringField({ name: 'name' });

    const User = makeModel(
        class extends BaseModel {
            static declaredFields = [idField, nameField];
        },
        'User',
    );

    const usersQueryset = new QuerySet('users', { [RequestTypes.LIST]: User });

    const usersData = [
        { id: 1, name: 'Name1' },
        { id: 2, name: 'SameName' },
        { id: 3, name: 'SameName' },
    ];

    test('execute', async () => {
        const executor = new AggregatedQueriesExecutor(usersQueryset, 'id');

        async function assertDataValid(promise, expectedData) {
            const instance = await promise;
            expect(instance._getInnerData()).toStrictEqual(expectedData);
        }

        async function assertNotFound(promise) {
            try {
                await promise;
                throw new Error('Instance must be not found');
            } catch (e) {
                if (!(e instanceof NotFoundError)) throw e;
            }
        }

        const checks = Promise.all([
            assertDataValid(executor.query(1), usersData[0]),
            assertDataValid(executor.query(2), usersData[1]),
            assertDataValid(executor.query(3), usersData[2]),
            assertNotFound(executor.query(4)),
            assertDataValid(executor.query(3), usersData[2]),
            assertDataValid(executor.query(2), usersData[1]),
            assertDataValid(executor.query(1), usersData[0]),
        ]);

        fetchMock.mockResponseOnce(
            JSON.stringify([
                {
                    status: 200,
                    data: {
                        count: 3,
                        next: null,
                        previous: null,
                        results: usersData,
                    },
                },
            ]),
        );
        await executor.execute();
        await checks;
    });
});
