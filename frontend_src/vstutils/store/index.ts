import { createPinia } from 'pinia';
import { GLOBAL_STORE, GlobalStore } from './globalStore';
import { createLocalSettingsStore, LocalSettingsStore } from './localSettingsStore';
import { createUserSettingsStore, UserSettingsStore } from './userSettingsStore';

export * from './page';
export * from './helpers';

export {
    GLOBAL_STORE,
    createLocalSettingsStore,
    createUserSettingsStore,
    LocalSettingsStore,
    UserSettingsStore,
    GlobalStore,
};

export const pinia = createPinia();
