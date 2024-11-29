import { createApp, createSchema, expectNthRequest, useTestCtx } from '#unittests';

beforeAll(async () => {
    await createApp({
        schema: createSchema({
            definitions: {
                SomeModel: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', readOnly: true },
                        name: { type: 'string' },
                        rating: { type: 'integer', readOnly: true, minimum: 1, maximum: 5 },
                    },
                },
            },
            paths: {
                '/some_path/': {
                    get: {
                        operationId: 'some_path_list',
                        responses: {
                            200: {
                                description: 'Success',
                                schema: { $ref: '#/definitions/SomeModel' },
                            },
                        },
                    },
                },
                '/some_path/{id}/': {
                    parameters: [{ name: 'id', in: 'path', required: true, type: 'integer' }],
                    get: {
                        operationId: 'some_path_get',
                        responses: {
                            200: {
                                description: 'Success',
                                schema: { $ref: '#/definitions/SomeModel' },
                            },
                        },
                    },
                    patch: {
                        operationId: 'some_path_edit',
                        parameters: [
                            {
                                name: 'data',
                                in: 'body',
                                required: true,
                                schema: { $ref: '#/definitions/SomeModel' },
                            },
                        ],
                        responses: {
                            200: {
                                description: 'Success',
                                schema: { $ref: '#/definitions/SomeModel' },
                            },
                        },
                    },
                },
            },
        }),
    });
});

test('readonly fields validation', async () => {
    const { app, screen, waitFor, user } = useTestCtx();
    app.api.disableBulk = true;

    fetchMock.mockResponse(JSON.stringify({ id: 1, name: 'Some name', rating: 0 }));

    // Open edit page and wait for page to load
    await app.router.push('/some_path/1/edit/');
    const nameField = await screen.findByLabelText('Name');
    // Change name
    await user.click(nameField);
    await user.keyboard('{Backspace}{Backspace}{Backspace}{Backspace}new name');

    // Save value and mock response
    fetchMock.mockResponseOnce(JSON.stringify({ id: 1, name: 'Some new name', rating: 0 }));
    await user.click(screen.getByTitle('Save'));

    // Check that new value saved and redirected to detail page
    await waitFor(() => expect(fetchMock).toBeCalledTimes(2));
    await expectNthRequest(1, {
        url: 'http://localhost/api/v1/some_path/1/',
        method: 'PATCH',
        body: { name: 'Some new name' },
    });
    await waitFor(() => expect(app.router.currentRoute.fullPath).toBe('/some_path/1'));
});
