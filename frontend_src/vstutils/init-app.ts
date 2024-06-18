import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import OpenAPILoader from '@/vstutils/OpenAPILoader';
import { createApiFetch } from '@/vstutils/api-fetch';
import { type AuthAppFactory } from './auth-app';
import { signals } from '@/vstutils/signals';
import { App } from '@/vstutils/app';
import { type Cache, globalCache } from '@/cache';
import type Vue from 'vue';
import { createDefaultPageLoader } from './default-page-loader';
import { type AppSchema } from './schema';

export type LogoutHandler = (params: { config: InitAppConfig }) => void | Promise<void>;

export interface InitAppConfigRaw {
    el?: string | HTMLElement;
    pageLoader?: PageLoader;
    fatalErrorHandler?: FatalErrorHandler;
    logoutHandler?: LogoutHandler;
    auth?: {
        authorityUrl?: string;
        clientId?: string;
        clientSecret?: string;
        redirectUri?: string;
    };
    createAuthApp?: AuthAppFactory;
    cache?: Cache;
    vue?: typeof Vue;
    api: {
        url: string;
        endpointPath?: string;
        disableBulk?: boolean;
    };
}

export interface InitAppConfig {
    el: HTMLElement;
    auth: Oauth2Config;
    pageLoader: PageLoader;
    fatalErrorHandler: FatalErrorHandler;
    logoutHandler: LogoutHandler;
    createAuthApp?: AuthAppFactory;
    cache: Cache;
    vue?: typeof Vue;
    api: ApiConfig;
}

interface Oauth2Config {
    userManager: UserManager;
}

interface ApiConfig {
    url: URL;
    endpointPath: string;
    disableBulk: boolean;
}

export async function initApp(rawConf: InitAppConfigRaw) {
    try {
        const config = await getConfig(rawConf);
        await _initApp(config);
    } catch (e) {
        (rawConf.fatalErrorHandler ?? defaultStartupFatalErrorHandler)({ error: e });
    }
}

export interface PageLoader {
    show: () => void | Promise<void>;
    hide: () => void | Promise<void>;
}

async function _initApp(config: InitAppConfig) {
    config.pageLoader.show();

    registerSw();

    if (!(await isUserLoggedIn(config))) {
        await openAuthApp(config);
        return;
    }

    const schema = await loadSchema(config);

    const app = new App({ config, schema });
    // @ts-expect-error It's a global variable
    window.app = app;
    await app.start();
    app.mount(createChildEl(config.el));
    await config.pageLoader.hide();
    return app;
}

async function getConfig(config: InitAppConfigRaw): Promise<InitAppConfig> {
    const pageLoader = config.pageLoader ?? createDefaultPageLoader();
    pageLoader.show();

    const apiConfig = {
        url: new URL(config.api.url.endsWith('/') ? config.api.url : `${config.api.url}/`),
        endpointPath: config.api.endpointPath ?? 'endpoint/',
        disableBulk: config.api.disableBulk ?? false,
    } satisfies ApiConfig;

    return {
        el: getRootEl(config.el),
        pageLoader,
        fatalErrorHandler: config.fatalErrorHandler ?? defaultStartupFatalErrorHandler,
        logoutHandler: config.logoutHandler ?? defaultLogoutHandler,
        createAuthApp: config.createAuthApp,
        auth: {
            userManager: await _createUserManager(config, apiConfig),
        },
        cache: config.cache ?? globalCache,
        api: apiConfig,
    };
}

export async function _createUserManager(config: InitAppConfigRaw, apiConfig: ApiConfig) {
    const schemaConfig = createSchemaOauthConfigProvider(apiConfig);
    const providedConfig = config.auth ?? {};

    const authority = providedConfig.authorityUrl || (await schemaConfig.getAuthorityUrl());
    if (!authority) {
        throw new Error('Authority is not provided');
    }
    const clientId = providedConfig.clientId || (await schemaConfig.getClientId());
    if (!clientId) {
        throw new Error('Client id is not provided');
    }
    return new UserManager({
        authority,
        client_id: clientId,
        client_secret: providedConfig.clientSecret,
        redirect_uri: providedConfig.redirectUri ?? 'not_used',
        monitorSession: true,
        automaticSilentRenew: true,
        scope: '',
        userStore: new WebStorageStateStore({ store: window.localStorage }),
    });
}

async function openAuthApp(config: InitAppConfig) {
    const authAppFactory =
        config.createAuthApp ?? (await import('@/vstutils/default-auth-app')).createDefaultAuthApp;
    const child = createChildEl(config.el);

    const authApp = await authAppFactory({
        config,
        openMainApp: (path) => void openMainApp(path),
    });

    async function openMainApp(path?: string) {
        authApp.destroy();
        config.el.innerHTML = '';
        window.location.hash = path ?? '/';
        await _initApp(config);
    }
    config.pageLoader.hide();
    authApp.mount(child);
}

function getRootEl(el?: string | HTMLElement): HTMLElement {
    if (typeof el === 'string') {
        return document.querySelector(el)!;
    }
    if (el && typeof el === 'object') {
        return el;
    }
    return document.getElementById('app')!;
}

function createChildEl(el: HTMLElement) {
    const wrapper = el.ownerDocument.createElement('div');
    el.appendChild(wrapper);
    return wrapper;
}

function registerSw() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').catch((error) => {
            console.error('Service Worker registration failed with ' + error);
        });
    }
}

async function isUserLoggedIn(config: InitAppConfig): Promise<boolean> {
    const userManager = config.auth.userManager;
    if (!(await userManager.getUser())) {
        return false;
    }
    const userInfoEndpoint = await userManager.metadataService.getUserInfoEndpoint();
    const apiFetch = createApiFetch({ config });
    const response = await apiFetch(userInfoEndpoint);
    if (response.status === 200) {
        return true;
    }
    return false;
}

async function loadSchema(config: InitAppConfig) {
    const schemaLoader = new OpenAPILoader({ config });
    window.schemaLoader = schemaLoader;
    const schema = await schemaLoader.loadSchema();
    signals.emit('openapi.loaded', schema);
    sessionStorage.setItem('defaultSchema', JSON.stringify(schema));
    return schema;
}

function createSchemaOauthConfigProvider(apiConfig: ApiConfig) {
    const loadSchemaOnce = (() => {
        let schema: AppSchema | null = JSON.parse(sessionStorage.getItem('defaultSchema') || 'null');

        return async (): Promise<AppSchema> => {
            if (schema) {
                return schema;
            }
            const url = new URL(apiConfig.endpointPath, apiConfig.url);
            url.searchParams.set('format', 'openapi');
            const response = await fetch(url);
            schema = await response.json();
            sessionStorage.setItem('defaultSchema', JSON.stringify(schema));
            return schema as AppSchema;
        };
    })();

    async function getAuthorityUrl() {
        const schema = await loadSchemaOnce();
        for (const def of Object.values(schema.securityDefinitions ?? {})) {
            if (def.type === 'oauth2') {
                if ('authorizationUrl' in def) {
                    return new URL(def.authorizationUrl).origin;
                }
                if ('tokenUrl' in def) {
                    return new URL(def.tokenUrl).origin;
                }
            }
        }
        return;
    }

    async function getClientId() {
        const schema = await loadSchemaOnce();
        for (const def of Object.values(schema.securityDefinitions ?? {})) {
            if (def.type === 'oauth2') {
                if ('x-clientId' in def && def['x-clientId']) {
                    return def['x-clientId'] as string;
                }
            }
        }
        return;
    }

    return {
        getAuthorityUrl,
        getClientId,
    };
}

type FatalErrorHandler = (params: { error: unknown }) => any;

export const createStartupFatalErrorHandler = (f: FatalErrorHandler) => f;

const defaultStartupFatalErrorHandler = createStartupFatalErrorHandler(({ error }) => {
    console.error('Fatal error', error);

    const title = document.createElement('p');
    title.innerText = 'Error occurred!';
    title.setAttribute(
        'style',
        `
            font-size: 2rem;
        `,
    );

    const text = document.createElement('p');
    text.textContent = `Details: ${error}`;
    text.setAttribute(
        'style',
        `
            color: gray;
            font-size: 0.7rem;
            font-family: monospace;
        `,
    );

    const wrapper = document.createElement('div');
    wrapper.setAttribute(
        'style',
        `
            position: absolute;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: white;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
        `,
    );
    wrapper.appendChild(title);
    wrapper.appendChild(text);
    document.body.innerHTML = '';
    document.body.insertAdjacentElement('beforeend', wrapper);

    throw error;
});

const defaultLogoutHandler: LogoutHandler = async ({ config }) => {
    try {
        await config.auth.userManager.revokeTokens();
    } catch (error) {
        console.error('Revoke error', error);
    }
    await config.auth.userManager.removeUser();
    window.location.href = '/';
};
