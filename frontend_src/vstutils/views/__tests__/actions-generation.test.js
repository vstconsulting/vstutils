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

    test('x-title will be used as action label and view title', async () => {
        const app = await createApp({
            schema: createSchema({
                paths: {
                    '/user/{id}/some_action/': {
                        parameters: [{ name: 'id', in: 'path', required: true, type: 'integer' }],
                        post: {
                            operationId: 'user_some_action',
                            parameters: [
                                {
                                    name: 'data',
                                    in: 'body',
                                    required: true,
                                    schema: { $ref: '#/definitions/User' },
                                },
                            ],
                            responses: {
                                200: {
                                    schema: { $ref: '#/definitions/User' },
                                },
                            },
                            'x-title': 'Customized label',
                        },
                    },
                },
            }),
        });

        const view = app.views.get('/user/{id}/some_action/');
        expect(view.actions.get('execute').title).toBe('Customized label');
        expect(view.getTitle()).toBe('Customized label');
    });
});
