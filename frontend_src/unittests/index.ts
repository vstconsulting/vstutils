import { expect } from '@jest/globals';
import { mount as vueMount } from '@vue/test-utils';
import { waitFor as _waitFor } from '@testing-library/dom';
import { getApp } from '@/vstutils/utils';

import type { ComponentOptions } from 'vue';

export * from './create-app';
export * from './schema';
export * from './open-page';

export function mount(component: ComponentOptions<Vue>, options?: Parameters<typeof vueMount>[1]) {
    const app = getApp();
    return vueMount(component, {
        localVue: app.vue,
        i18n: app.i18n,
        router: app.router,
        attachTo: document.body,
        ...options,
    });
}

export async function mountApp() {
    const app = globalThis.__currentApp;

    if (!app) {
        throw new Error('App is not initialized, use createApp() first');
    }

    const wrapper = mount(
        { mixins: [app.appRootComponent, ...app.additionalRootMixins] },
        {
            propsData: {
                info: app.config.schema.info,
                x_menu: app.config.schema.info['x-menu'],
                x_docs: app.config.schema.info['x-docs'],
            },
        },
    );

    // @ts-expect-error Override rootVm
    app.rootVm = wrapper.vm;

    await waitForPageLoading();

    return wrapper;
}

export function waitFor<T>(callback: () => T, options?: Parameters<typeof _waitFor>[1]) {
    const container = options?.container || __currentApp?.rootVm?.$el;
    if (!container) {
        throw new Error('App must be mounted first or custom must be provided');
    }
    return _waitFor(callback, {
        ...options,
        // @ts-expect-error $el is ok here
        container,
    });
}

export async function waitForPageLoading() {
    await waitFor(() => expect(__currentApp?.rootVm?.$el.querySelector('.in-loading')).toBeFalsy());
}
