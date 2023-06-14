import { effectScope } from 'vue';
import { isNavigationFailure, NavigationFailureType } from 'vue-router';
import { getApp, NOT_FOUND_ROUTE_NAME } from '@/vstutils/utils';
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
    if (route?.name === NOT_FOUND_ROUTE_NAME) {
        throw new Error(`Location not found ${JSON.stringify(to)}`);
    }
    const view = app.router.currentRoute.meta!.view as IView;
    const store = effectScope().run(() => view._createStore())!;
    await app.store.setPage(store);
}
