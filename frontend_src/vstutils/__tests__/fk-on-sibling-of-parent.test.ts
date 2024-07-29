import { createSchema, createApp, schemaListOf } from '#unittests';

test('Foreign key on sibling of parent', async () => {
    await createApp({
        schema: createSchema({
            definitions: {
                Fk: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                    },
                },
                WithFk: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        fk: {
                            type: 'integer',
                            format: 'fk',
                            'x-options': {
                                model: { $ref: '#/definitions/Fk' },
                            },
                        },
                    },
                },
            },
            paths: {
                '/some_1/{some_1_id}/fk/': {
                    parameters: [{ name: 'some_1_id', in: 'path', required: true, type: 'integer' }],
                    get: {
                        operationId: 'fks',
                        'x-list': true,
                        responses: {
                            200: {
                                description: 'List of fk',
                                schema: schemaListOf({ $ref: '#/definitions/Fk' }),
                            },
                        },
                    },
                },
                '/some_1/{some_1_id}/some_2/{some_2_id}/some_3/{some_3_id}/with_fk/': {
                    parameters: [
                        { name: 'some_1_id', in: 'path', required: true, type: 'integer' },
                        { name: 'some_2_id', in: 'path', required: true, type: 'integer' },
                        { name: 'some_3_id', in: 'path', required: true, type: 'integer' },
                    ],
                    get: {
                        operationId: 'with_fk_list',
                        responses: {
                            200: {
                                description: 'List of with_fk',
                                schema: schemaListOf({ $ref: '#/definitions/WithFk' }),
                            },
                        },
                    },
                },
                '/some_1/{some_1_id}/some_2/{some_2_id}/some_3/{some_3_id}/with_fk/{with_fk_id}/': {
                    parameters: [
                        { name: 'some_1_id', in: 'path', required: true, type: 'integer' },
                        { name: 'some_2_id', in: 'path', required: true, type: 'integer' },
                        { name: 'some_3_id', in: 'path', required: true, type: 'integer' },
                        { name: 'with_fk_id', in: 'path', required: true, type: 'integer' },
                    ],
                    get: {
                        operationId: 'with_fk_get',
                        responses: {
                            200: {
                                description: 'WithFk',
                                schema: { $ref: '#/definitions/WithFk' },
                            },
                        },
                    },
                },
            },
        }),
    });
});
