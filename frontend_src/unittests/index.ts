import { mount as vueMount } from '@vue/test-utils';
import { deferredPromise, getApp } from '@/vstutils/utils';

import type { ComponentOptions } from 'vue';

export * from './create-app';
export * from './schema';
export * from './open-page';

export function mount(component: ComponentOptions<Vue>, options?: Parameters<typeof vueMount>[1]) {
    const app = getApp();
    return vueMount(component, { localVue: app.vue, i18n: app.i18n, router: app.router, ...options });
}

export function mountApp() {
    const app = globalThis.__currentApp;

    if (!app) {
        throw new Error('App is not initialized, use createApp() first');
    }

    return mount(
        { mixins: [app.appRootComponent, ...app.additionalRootMixins] },
        {
            propsData: {
                info: app.config.schema.info,
                x_menu: app.config.schema.info['x-menu'],
                x_docs: app.config.schema.info['x-docs'],
            },
        },
    );
}

function waitFor(callback: () => boolean) {
    const { promise, resolve, reject } = deferredPromise<void>();

    let intervalId: ReturnType<typeof setInterval>;
    // eslint-disable-next-line prefer-const
    let timeoutId: ReturnType<typeof setTimeout>;

    // eslint-disable-next-line prefer-const
    intervalId = setInterval(() => {
        if (callback()) {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
            resolve();
        }
    }, 50);

    timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        reject('waitFor timeout');
    }, 1000);

    return promise;
}

export function waitForPageLoading() {
    const app = getApp();
    return waitFor(() => !app.store.page.loading);
}
