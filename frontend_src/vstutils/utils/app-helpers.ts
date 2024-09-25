import type { IAppInitialized } from '../app';

let __appRef = null as unknown as IAppInitialized;

export function __setApp(app: IAppInitialized) {
    __appRef = app;
}

export function getApp(): IAppInitialized {
    return __appRef;
}
