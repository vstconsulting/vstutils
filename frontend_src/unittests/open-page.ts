import { isNavigationFailure, NavigationFailureType } from 'vue-router';
import { getApp } from '@/vstutils/utils';
import type { IView } from '@/vstutils/views';
import type { RawLocation } from 'vue-router';

export async function openPage(to: RawLocation) {
    const app = getApp();
    let route;
    try {
        route = await app.router.push(to);
    } catch (e) {
        if (!isNavigationFailure(e, NavigationFailureType.duplicated)) {
            throw Error('Navigation failed', { cause: e });
        }
    }
    if (route?.name === '404') {
        throw new Error(`Location not found ${JSON.stringify(to)}`);
    }
    const view = app.router.currentRoute.meta!.view as IView;
    const store = view._createStore();
    await app.store.setPage(store);
}
