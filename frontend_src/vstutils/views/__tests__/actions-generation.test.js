import { expect, test, describe } from '@jest/globals';
import { createApp } from '@/unittests/create-app';
import { createSchema } from '@/unittests/schema';
import emptyActionSchema from './empty-action-schema.json';

describe('ViewConstructor', () => {
    test('empty actions', async () => {
        const app = await createApp({
            schema: createSchema(emptyActionSchema),
        });

        expect(app.views.get('/user/{id}/disable/')).toBeUndefined();
        expect(app.views.get('/user/{id}/').actions.get('disable')).toBeTruthy();
    });
});
