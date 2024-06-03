import { type InitAppConfig } from './init-app';

export interface CreateAuthAppParams {
    config: InitAppConfig;
    openMainApp: (path?: string) => void;
}

export interface AuthApp {
    mount: (el: HTMLElement | string) => void;
    destroy: () => void;
}

export type AuthAppFactory = (params: CreateAuthAppParams) => AuthApp | Promise<AuthApp>;

export const createAuthAppFactory = (f: AuthAppFactory) => f;
