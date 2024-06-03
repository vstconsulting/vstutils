import { User } from 'oidc-client-ts';
import { createLocalVue } from '@vue/test-utils';
import VueI18n from 'vue-i18n';
import { DummyCache } from '@/cache';
import { type AppSchema } from '@/vstutils/schema';
import { type InitAppConfigRaw, _createUserManager } from '@/vstutils/init-app';
import { getApp } from '@/vstutils/utils';
import testSchema from '../__mocks__/testSchema.json';

// Important to import from index to trigger side effects as if it was a real app
import { initApp } from '@/index';

export async function createApp(params?: { schema?: Partial<AppSchema>; disableBulk?: boolean }) {
    // Remove old app
    const previousApp = getApp();
    if (previousApp) {
        previousApp.rootVm.$destroy();
        previousApp.rootVm.$el.remove();
    }
    window.location.href = '/';

    // Prepare config

    const vue = createLocalVue();
    vue.config.productionTip = false;
    vue.use(VueI18n);
    const el = document.createElement('div');
    document.body.appendChild(el);
    const config: InitAppConfigRaw = {
        el,
        vue,
        cache: new DummyCache(),
        auth: { authorityUrl: 'https://auth.test', clientId: 'test-id', clientSecret: 'test-secret' },
        api: { url: 'http://localhost/api/', disableBulk: true },
    };
    const schema = params?.schema ?? testSchema;

    // Emulate previously authenticated user
    const userManger = await _createUserManager(config, {
        url: new URL('http://localhost/api/'),
        endpointPath: '/endpoint/',
        disableBulk: false,
    });

    // @ts-expect-error Skip some properties
    const user = new User({
        access_token: 'test-access_token',
        refresh_token: 'test-refresh_token',
        token_type: 'Bearer',
    });
    await userManger.storeUser(user);

    // Start app

    // eslint-disable-next-line @typescript-eslint/require-await
    fetchMock.mockResponse(async (request) => {
        const body = (request.body as Buffer | null)?.toString();

        if (
            request.url === 'https://auth.test/.well-known/openid-configuration' &&
            request.method === 'GET'
        ) {
            return {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    issuer: 'https://auth.test',
                    response_types_supported: ['token'],
                    grant_types_supported: ['password'],
                    token_endpoint: 'https://auth.test/api/oauth2/token/',
                    revocation_endpoint: 'https://auth.test/api/oauth2/revoke/',
                    userinfo_endpoint: 'https://auth.test/api/oauth2/userinfo/',
                }),
            };
        }

        if (
            request.url === 'https://auth.test/api/oauth2/userinfo/' &&
            request.method === 'GET' &&
            request.headers.get('Authorization') === 'Bearer test-access_token'
        ) {
            return {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sub: '1',
                }),
            };
        }

        if (
            request.url === 'http://localhost/api/endpoint/?format=openapi' &&
            request.method === 'GET' &&
            request.headers.get('Authorization') === 'Bearer test-access_token'
        ) {
            return {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(schema),
            };
        }

        if (
            request.url === 'http://localhost/api/v1/user/profile/_settings/' &&
            request.method === 'GET' &&
            request.headers.get('Authorization') === 'Bearer test-access_token'
        ) {
            return {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: {
                        main: {
                            language: 'en',
                            dark_mode: false,
                        },
                    },
                }),
            };
        }

        if (
            request.method === 'PUT' &&
            request.url === 'http://localhost/api/endpoint/' &&
            body === '[{"method":"GET","path":["_lang"]}]'
        ) {
            return {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([
                    {
                        status: 200,
                        data: {
                            results: [
                                { code: 'en', name: 'English' },
                                { code: 'ru', name: 'Russian' },
                            ],
                        },
                    },
                ]),
            };
        }

        if (
            request.method === 'PUT' &&
            request.url === 'http://localhost/api/endpoint/' &&
            body === '[{"method":"GET","path":["_lang","en"]}]'
        ) {
            return {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([
                    {
                        status: 200,
                        data: {
                            translations: {
                                version: 'versions | version | versions',
                            },
                        },
                    },
                ]),
            };
        }

        if (
            request.url === 'http://localhost/api/v1/user/profile/' &&
            request.method === 'GET' &&
            request.headers.get('Authorization') === 'Bearer test-access_token'
        ) {
            return {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'admin@admin.admin',
                    first_name: '',
                    id: 1,
                    is_active: true,
                    is_staff: false,
                    last_name: '',
                    username: 'testUser',
                }),
            };
        }

        throw new Error(`Unexpected request: ${request.url}`);
    });

    await initApp(config);

    fetchMock.resetMocks();

    const app = getApp();

    if (!params?.disableBulk) {
        app.config.api.disableBulk = false;
        app.api.disableBulk = false;
    }

    return app;
}
