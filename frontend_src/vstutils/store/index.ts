import { createPinia } from 'pinia';
import { GLOBAL_STORE, GlobalStore } from './globalStore';
import { createLocalSettingsStore, LocalSettingsStore } from './localSettingsStore';
import { createUserSettingsStore, UserSettingsStore } from './userSettingsStore';
import {
    createListViewStore,
    createDetailViewStore,
    createEditViewStore,
    createNewViewStore,
    createActionViewStore,
} from './page';

export {
    GLOBAL_STORE,
    createLocalSettingsStore,
    createUserSettingsStore,
    createListViewStore,
    createDetailViewStore,
    createEditViewStore,
    createNewViewStore,
    createActionViewStore,
    LocalSettingsStore,
    UserSettingsStore,
    GlobalStore,
};

export const pinia = createPinia();
