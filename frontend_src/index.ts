import * as spa from './app.common.js';
export { spa };
globalThis.spa = spa;

export { initApp, type InitAppConfig, type LogoutHandler } from './vstutils/init-app';
export { type AuthAppFactory } from './vstutils/auth-app';
export { getApp } from './vstutils/utils';
export {
    hookViewOperation,
    onAppAfterInit,
    onAppBeforeInit,
    onAppCreated,
    onFilterListViewColumns,
    onFilterOperations,
    onRoutesCreated,
    onSchemaLoaded,
    onSchemaModelsCreated,
    onSchemaViewsCreated,
} from './vstutils/signals';
export { type AppSchema } from './vstutils/schema';
export { defineFieldComponent } from './vstutils/fields/base/defineFieldComponent';
export { BaseField } from './vstutils/fields/base/BaseField';
export { showConfirmationModal } from './vstutils/confirmation-modal';
export { onNestedObjectsTableRowBeforeChange } from './vstutils/fields/nested-object/signals';
