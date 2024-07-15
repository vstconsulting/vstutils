import OpenAPILoader from '@/vstutils/OpenAPILoader';
import { createApiFetch } from '@/vstutils/api-fetch';
import { App } from '@/vstutils/app';
import { signals } from '@/vstutils/signals';
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import type Vue from 'vue';
import { type AuthAppFactory } from './auth-app';
import { createDefaultPageLoader } from './default-page-loader';
import type { AppSchema } from './schema';
import { cleanAllCacheAndReloadPage } from './cleanCacheHelpers';

const SILENT_REDIRECT_URL = new URL('/#/__oauth2_silent_redirect', window.location.origin);

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
    vue?: typeof Vue;
    api: ApiConfig;
}

interface Oauth2Config {
    userManager: UserManager;
}

type InitAppContext = {
    rawConfig: InitAppConfigRaw;
};

type InitAppContextWithConfig = InitAppContext & {
    config: InitAppConfig;
    isCachedOauthAuthorityUsed: boolean;
    isCachedOauthClientIdUsed: boolean;
};

export interface ApiConfig {
    url: URL;
    endpointPath: string;
    disableBulk: boolean;
}

export async function initApp(rawConfig: InitAppConfigRaw) {
    try {
        const ctx = await prepareConfig({ rawConfig });
        if (window.location.hash === SILENT_REDIRECT_URL.hash) {
            await ctx.config.auth.userManager.signinSilentCallback();
            return;
        }
        await _initApp(ctx);
    } catch (e) {
        if (e instanceof RestartAppError) {
            return initApp(rawConfig);
        }
        (rawConfig.fatalErrorHandler ?? defaultStartupFatalErrorHandler)({ error: e });
    }
}

export interface PageLoader {
    show: () => void | Promise<void>;
    hide: () => void | Promise<void>;
}

async function _initApp(ctx: InitAppContextWithConfig) {
    ctx.config.pageLoader.show();

    registerSw();

    if (!(await isUserLoggedIn(ctx.config))) {
        await openAuthApp(ctx);
        return;
    }

    const schema = await loadSchema(ctx.config);
    if (!verifyAndSetCachedOauthParams(ctx, schema)) {
        throw new RestartAppError();
    }

    const app = new App({ config: ctx.config, schema });
    // @ts-expect-error It's a global variable
    window.app = app;
    await app.start();
    app.mount(createChildEl(ctx.config.el));
    await ctx.config.pageLoader.hide();
    return app;
}

function verifyAndSetCachedOauthParams(ctx: InitAppContextWithConfig, schema: AppSchema) {
    const storageConfig = createStorageOauthConfigProvider(window.localStorage);
    let ok = true;
    if (ctx.isCachedOauthAuthorityUsed) {
        const actualAuthority = getAuthorityUrlFromSchema(schema);
        if (actualAuthority && actualAuthority !== ctx.config.auth.userManager.settings.authority) {
            ok = false;
            storageConfig.setAuthorityUrl(actualAuthority);
        }
    }
    if (ctx.isCachedOauthClientIdUsed) {
        const actualClientId = getClientIdFromSchema(schema);
        if (actualClientId && actualClientId !== ctx.config.auth.userManager.settings.client_id) {
            ok = false;
            storageConfig.setClientId(actualClientId);
        }
    }
    return ok;
}

async function prepareConfig({ rawConfig }: InitAppContext): Promise<InitAppContextWithConfig> {
    const pageLoader = rawConfig.pageLoader ?? createDefaultPageLoader();
    pageLoader.show();

    const apiConfig = {
        url: new URL(rawConfig.api.url.endsWith('/') ? rawConfig.api.url : `${rawConfig.api.url}/`),
        endpointPath: rawConfig.api.endpointPath ?? 'endpoint/',
        disableBulk: rawConfig.api.disableBulk ?? false,
    } satisfies ApiConfig;

    const { userManager, isCachedOauthAuthorityUsed, isCachedOauthClientIdUsed } = await _createUserManager(
        rawConfig,
        apiConfig,
    );

    return {
        rawConfig,
        config: {
            el: getRootEl(rawConfig.el),
            pageLoader,
            fatalErrorHandler: rawConfig.fatalErrorHandler ?? defaultStartupFatalErrorHandler,
            logoutHandler: rawConfig.logoutHandler ?? defaultLogoutHandler,
            createAuthApp: rawConfig.createAuthApp,
            auth: {
                userManager,
            },
            api: apiConfig,
        },
        isCachedOauthAuthorityUsed,
        isCachedOauthClientIdUsed,
    };
}

async function openAuthApp(ctx: InitAppContextWithConfig) {
    const config = ctx.config;
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
        await _initApp(ctx);
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
    let user = await userManager.getUser();
    if (!user) {
        return false;
    }
    if (user.expired) {
        if (!user.refresh_token) {
            return false;
        }
        try {
            user = await userManager.signinSilent();
        } catch {
            return false;
        }
        if (!user) {
            return false;
        }
    }
    const userInfoEndpoint = await userManager.metadataService.getUserInfoEndpoint();
    const apiFetch = createApiFetch({ config });
    const response = await apiFetch(userInfoEndpoint);
    if (response.status !== 200) {
        await userManager.removeUser();
        return false;
    }
    const data = await response.json();
    if (Boolean(data.anon) !== Boolean(user.profile.anon)) {
        await userManager.removeUser();
        return false;
    }
    return true;
}

async function loadSchema(config: InitAppConfig) {
    const schemaLoader = new OpenAPILoader({ config });
    window.schemaLoader = schemaLoader;
    const schema = await schemaLoader.loadSchema();
    signals.emit('openapi.loaded', schema);
    return schema;
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
            margin: 0;
        `,
    );

    const clearCacheAndReloadButton = document.createElement('button');
    clearCacheAndReloadButton.textContent = 'Clear cache';
    clearCacheAndReloadButton.className = 'btn btn-secondary';
    clearCacheAndReloadButton.type = 'button';
    clearCacheAndReloadButton.addEventListener('click', () => {
        cleanAllCacheAndReloadPage({ resetAll: true });
    });

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
            gap: 20px;
        `,
    );
    wrapper.appendChild(title);
    wrapper.appendChild(clearCacheAndReloadButton);
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

export async function _createUserManager(config: InitAppConfigRaw, apiConfig: ApiConfig) {
    const schemaConfig = createSchemaOauthConfigProvider(apiConfig);
    const storageConfig = createStorageOauthConfigProvider(window.localStorage);
    const providedConfig = config.auth ?? {};

    let isCachedOauthAuthorityUsed = false;
    let authority: string | null | undefined = providedConfig.authorityUrl;
    if (!authority) {
        authority = storageConfig.getAuthorityUrl();
        if (authority) {
            isCachedOauthAuthorityUsed = true;
        } else {
            authority = await schemaConfig.getAuthorityUrl();
            if (authority) {
                storageConfig.setAuthorityUrl(authority);
            }
        }
    }
    if (!authority) {
        throw new Error('Authority is not provided');
    }

    let isCachedOauthClientIdUsed = false;
    let clientId: string | null | undefined = providedConfig.clientId;
    if (!clientId) {
        clientId = storageConfig.getClientId();
        if (clientId) {
            isCachedOauthClientIdUsed = true;
        } else {
            clientId = await schemaConfig.getClientId();
            if (clientId) {
                storageConfig.setClientId(clientId);
            }
        }
    }
    if (!clientId) {
        throw new Error('Client id is not provided');
    }

    return {
        isCachedOauthAuthorityUsed,
        isCachedOauthClientIdUsed,
        userManager: new UserManager({
            authority,
            client_id: clientId,
            client_secret: providedConfig.clientSecret,
            redirect_uri: providedConfig.redirectUri ?? 'not_used',
            automaticSilentRenew: true,
            scope: 'openid',
            userStore: new WebStorageStateStore({ store: window.localStorage }),
            silent_redirect_uri: SILENT_REDIRECT_URL.toString(),
        }),
    };
}

export function verifyAndSaveToCache(schema: AppSchema) {
    const storageConfig = createStorageOauthConfigProvider(window.localStorage);
    const clientId = getClientIdFromSchema(schema);
    if (clientId) {
        storageConfig.setClientId(clientId);
    }
    const authorityUrl = getAuthorityUrlFromSchema(schema);
    if (authorityUrl) {
        storageConfig.setAuthorityUrl(authorityUrl);
    }
}

function createStorageOauthConfigProvider(storage: Storage) {
    return {
        getAuthorityUrl: () => storage.getItem('oidc-cache:authorityUrl'),
        getClientId: () => storage.getItem('oidc-cache:clientId'),
        setAuthorityUrl: (value: string) => storage.setItem('oidc-cache:authorityUrl', value),
        setClientId: (value: string) => storage.setItem('oidc-cache:clientId', value),
    };
}

function getAuthorityUrlFromSchema(schema: AppSchema) {
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

function getClientIdFromSchema(schema: AppSchema) {
    for (const def of Object.values(schema.securityDefinitions ?? {})) {
        if (def.type === 'oauth2') {
            if ('x-clientId' in def && def['x-clientId']) {
                return def['x-clientId'] as string;
            }
        }
    }
    return;
}

function createSchemaOauthConfigProvider(apiConfig: ApiConfig) {
    const loadSchemaOnce = (() => {
        let schema: AppSchema | null = null;

        return async (): Promise<AppSchema> => {
            if (schema) {
                return schema;
            }
            const url = new URL(apiConfig.endpointPath, apiConfig.url);
            url.searchParams.set('format', 'openapi');
            const response = await fetch(url);
            schema = await response.json();
            return schema as AppSchema;
        };
    })();

    async function getAuthorityUrl() {
        return getAuthorityUrlFromSchema(await loadSchemaOnce());
    }

    async function getClientId() {
        return getClientIdFromSchema(await loadSchemaOnce());
    }

    return {
        getAuthorityUrl,
        getClientId,
    };
}

class RestartAppError extends Error {}
