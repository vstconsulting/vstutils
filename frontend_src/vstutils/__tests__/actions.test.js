import { expectNthRequest, createApp } from '#unittests';

describe('Actions', () => {
    /** @type {App} */
    let app;

    beforeAll(() => {
        return createApp().then((a) => {
            app = a;
        });
    });

    beforeEach(() => {
        fetchMock.resetMocks();
    });

    test('empty actions execution', async () => {
        fetchMock.mockOnce(JSON.stringify([{ status: 200, data: { some: 'value' } }]));
        const callback = vitest.fn();
        const action = {
            name: 'test_action',
            title: 'Test actions',
            path: '/test/path/',
            method: 'put',
            isEmpty: true,
            onAfter: callback,
        };

        await app.actions.execute({ action });
        expect(fetchMock.mock.calls).toHaveLength(1);
        await expectNthRequest(0, {
            method: 'PUT',
            url: 'http://localhost/api/endpoint/',
            body: [{ method: 'put', path: '/test/path/' }],
        });

        expect(callback).toBeCalledTimes(1);
        const arg = callback.mock.calls[0][0];
        expect(arg.action).toBe(action);
        expect(arg.response.data).toEqual({ some: 'value' });
        expect(arg.app).toBe(app);
        expect(arg.instance).toBeUndefined();
        expect(Object.keys(arg).length).toBe(4);
    });

    test('action with custom handler', () => {
        const action = { name: 'test_action', handler: vitest.fn() };
        app.actions.execute({ action });

        expect(action.handler).toBeCalledTimes(1);
        expect(action.handler).lastCalledWith({
            action,
            instance: undefined,
            fromList: false,
            disablePopUp: false,
        });
    });

    test('action with data', async () => {
        const ReqModel = app.modelsResolver.bySchemaObject({
            properties: {
                testField: { type: 'string' },
            },
        });
        const action = {
            name: 'test_action',
            method: 'patch',
            requestModel: ReqModel,
            path: 'execute',
        };
        const instance = ReqModel.fromRepresentData({ testField: 'some val' });

        fetchMock.mockOnce(JSON.stringify([{ status: 200, data: { some: 'return val' } }]));
        const result = await app.actions.executeWithData({
            action,
            instance,
            throwError: true,
            sendAll: true,
        });
        expect(result.data).toEqual({ some: 'return val' });
        expect(fetchMock).toBeCalledTimes(1);
        await expectNthRequest(0, {
            method: 'PUT',
            path: '/api/endpoint/',
            body: [{ method: 'patch', data: { testField: 'some val' }, path: 'execute' }],
        });
    });
});
