import { expect, jest, test, describe } from '@jest/globals';
import { makeModel, Model } from '../models/Model.js';
import QuerySet from '../querySet/QuerySet.js';
import StringField from '../fields/text/StringField.js';
import { IntegerField } from '../fields/numbers/integer.js';
import { APIResponse, apiConnector } from '../api';
import { RequestTypes } from '../utils';
import { AggregatedQueriesExecutor } from '../AggregatedQueriesExecutor.js';
import { NotFoundError } from '../querySet/errors.js';

jest.mock('./../api');

describe('AggregatedQueriesExecutor', () => {
    const idField = new IntegerField({ name: 'id', readOnly: true });
    const nameField = new StringField({ name: 'name' });

    const User = makeModel(
        class extends Model {
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
        apiConnector._requestHandler = (request) => {
            expect(request.method).toBe('get');
            expect(request.path).toStrictEqual(['users']);

            expect(request.query.id).toBe('1,2,3,4');

            return new APIResponse(200, {
                count: 3,
                next: null,
                previous: null,
                results: usersData,
            });
        };

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

        await executor.execute();
        await checks;
    });
});
