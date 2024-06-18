import * as spa from './app.common.js';
export { spa };
globalThis.spa = spa;

export { initApp, type InitAppConfig, type LogoutHandler } from './vstutils/init-app';
export { type AuthAppFactory } from './vstutils/auth-app';
export { getApp } from './vstutils/utils';
export {
    onAppAfterInit,
    onAppBeforeInit,
    onFilterOperations,
    onRoutesCreated,
    onSchemaLoaded,
    onSchemaModelsCreated,
    onSchemaViewsCreated,
} from './vstutils/signals';
export { type AppSchema } from './vstutils/schema';