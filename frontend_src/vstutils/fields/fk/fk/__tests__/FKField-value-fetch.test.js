import { test, describe, beforeAll, expect } from '@jest/globals';
import { createApp, mount } from '@/unittests';
import fetchMock from 'jest-fetch-mock';
import { deferredPromise } from '@/vstutils/utils';

describe('FKField value loader indicator', () => {
    let app;
    let field;
    let User;

    beforeAll(async () => {
        app = await createApp();
        app.router.push('/user/');
        app.store.setPage(app.views.get('/user/')._createStore());
        User = app.modelsResolver.byReferencePath('#/definitions/User');
        User.nonBulkMethods = ['get', 'GET'];
        field = app.fieldsResolver.resolveField({
            name: 'user',
            type: 'integer',
            format: 'fk',
            'x-options': {
                model: {
                    $ref: '#/definitions/User',
                },
                value_field: 'id',
                view_field: 'username',
                usePrefetch: false,
                makeLink: true,
            },
        });
        fetchMock.enableMocks();
    });

    test.each(['readonly', 'edit'])('%s with loader', async (type) => {
        const { promise, resolve } = deferredPromise();

        fetchMock.mockResponseOnce(() => {
            return Promise.resolve(JSON.stringify([{ id: 6 }]));
        });
        const wrapper = mount({
            template: `
                <FKField
                    :field="field"
                    :data="data" type="${type}"
                    @set-value="setUser"
                />
            `,
            components: { FKField: field.getComponent() },
            data() {
                return { field, data: { user: 6 } };
            },
            methods: {
                setUser({ value }) {
                    this.data.user = value;
                    resolve();
                },
            },
        });
        expect(wrapper.find('.loader').isVisible()).toBeTruthy();
        await promise;
        expect(wrapper.find('.loader').exists()).toBeFalsy();
    });

    test.each(['readonly', 'edit'])('%s without loader', async (type) => {
        const wrapper = mount({
            template: `<FKField :field="field" :data="data" type="${type}" />`,
            components: { FKField: field.getComponent() },
            data() {
                return { field, data: { user: new User() } };
            },
        });
        expect(wrapper.find('.loader').exists()).toBeFalsy();
    });
});
