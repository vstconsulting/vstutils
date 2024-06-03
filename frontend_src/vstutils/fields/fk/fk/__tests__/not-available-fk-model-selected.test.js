import { createApp, createSchema, schemaListOf } from '@/unittests';

test('app will return an error if the path for the FK request is not found', async () => {
    const fk = {
        type: 'integer',
        format: 'fk',
        'x-options': {
            value_field: 'id',
            view_field: 'username',
            model: { $ref: '#/definitions/FK' },
        },
    };
    const schema = createSchema({
        definitions: {
            Model: {
                type: 'object',
                properties: {
                    id: { type: 'number' },
                    name: { type: 'string' },
                    fk,
                },
            },
            FK: {
                type: 'object',
                properties: {
                    id: { type: 'number' },
                    name: { type: 'string' },
                },
            },
            Other: {
                type: 'object',
                properties: {
                    id: { type: 'number' },
                    name: { type: 'string' },
                },
            },
        },
        paths: {
            '/model/': {
                get: {
                    operationId: 'model_list',
                    responses: {
                        200: { schema: schemaListOf({ $ref: '#/definitions/Model' }) },
                    },
                },
            },
            '/other/': {
                get: {
                    operationId: 'other_list',
                    responses: {
                        200: { schema: schemaListOf({ $ref: '#/definitions/Other' }) },
                    },
                },
            },
            '/other/{id}/': {
                parameters: [{ name: 'id', in: 'path', type: 'number' }],
                get: {
                    operationId: 'other_get',
                    responses: {
                        200: { schema: { $ref: '#/definitions/Other' } },
                    },
                },
            },
            '/other/{id}/fk/': {
                parameters: [{ name: 'id', in: 'path', type: 'number' }],
                get: {
                    operationId: 'other_fk_list',
                    responses: {
                        200: { schema: schemaListOf({ $ref: '#/definitions/FK' }) },
                    },
                },
            },
        },
    });

    await expect(createApp({ schema })).rejects.toThrow('Cannot find model FK for path /model/');
});
