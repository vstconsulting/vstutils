import { isNavigationFailure, NavigationFailureType } from 'vue-router';
import { getApp, getUniqueId } from '@/vstutils/utils';
import type { IView } from '@/vstutils/views';
import { defineStore } from 'pinia';
import type { RawLocation } from 'vue-router';

export async function openPage(to: RawLocation) {
    const app = getApp();
    try {
        await app.router.push(to);
    } catch (e) {
        if (!isNavigationFailure(e, NavigationFailureType.duplicated)) {
            throw Error('Navigation failed', { cause: e });
        }
    }
    const view = app.router.currentRoute.meta!.view as IView;
    const useStore = defineStore(`${getUniqueId()}-store`, view.getStoreDefinition());
    const store = useStore();
    await app.store.setPage(store);
}
