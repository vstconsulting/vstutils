import type { IApp } from './vstutils/app';
import type SchemaLoader from './app_loader/OpenAPILoader.js';
import type * as SPA from './app.common.js';

declare global {
    interface String {
        format(args: Record<string, unknown>): string;
        format(args: any[]): string;
        format(...args: any[]): string;
    }
    interface Array<T> {
        get last(): T;
    }

    /* eslint-disable no-var */
    var spa: typeof SPA;
    var App: new (...args: any[]) => IApp;
    var __currentApp: IApp | undefined;
    var SELECT2_THEME: string;
    var schemaLoader: SchemaLoader;
    var cleanAllCacheAndReloadPage: () => void;
    /* eslint-enable no-var */
}

export {};
