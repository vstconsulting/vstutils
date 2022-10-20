import { createPinia } from 'pinia';
import { GLOBAL_STORE } from './globalStore';
import { createLocalSettingsStore } from './localSettingsStore';
import { createUserSettingsStore } from './userSettingsStore';
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
};

export const pinia = createPinia();
