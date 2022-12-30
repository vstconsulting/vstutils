import type { IApp } from './vstutils/app';
import type * as SPA from './app.common.js';
import type { APIResponse } from '@/vstutils/api/ApiConnector';

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
    var __currentApp: IApp;
    var SELECT2_THEME: string;
    /* eslint-enable no-var */
}

declare module '@/vstutils/models' {
    export class Model {
        __notFound?: true;
        _response?: APIResponse;
    }
}

export {};
