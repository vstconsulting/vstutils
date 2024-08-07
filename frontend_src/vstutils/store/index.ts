import { createPinia } from 'pinia';
export { GLOBAL_STORE, type GlobalStore } from './globalStore';
export { createLocalSettingsStore, type LocalSettingsStore } from './localSettingsStore';
export { createUserSettingsStore, type UserSettingsStore } from './userSettingsStore';

export * from './page';
export * from './page-types';
export * from './helpers';

export const pinia = createPinia();
