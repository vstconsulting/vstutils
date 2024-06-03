import type { IApp } from './vstutils/app';
import type SchemaLoader from './vstutils/OpenAPILoader';
import type * as SPA from './app.common.js';
import 'vitest-fetch-mock';

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
    var IS_TESTS: boolean | undefined;
    var DISABLE_AUTO_UPDATE: boolean | undefined;
    /* eslint-enable no-var */
}

export {};
