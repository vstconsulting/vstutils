import { IApp } from './vstutils/app';
import type * as SPA from './app.common.js';

declare global {
    interface String {
        format(args: any[]): string;
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

export {};
