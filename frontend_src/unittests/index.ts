import { expect } from '@jest/globals';
import { mount as vueMount } from '@vue/test-utils';
import { waitFor as _waitFor, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
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

let currentWrapper: ReturnType<typeof mount> | undefined;

export async function mountApp() {
    const app = globalThis.__currentApp;

    if (!app) {
        throw new Error('App is not initialized, use createApp() first');
    }

    if (currentWrapper) {
        throw new Error('Mounting of multiple apps is not supported');
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

    currentWrapper = wrapper;

    return wrapper;
}

export function useTestCtx() {
    if (!currentWrapper) {
        throw new Error('App must be mounted first');
    }
    const doc = currentWrapper.vm.$el.ownerDocument;
    const user = userEvent.setup({ document: doc });
    const screen = within(doc.body);

    return { app: getApp(), screen, user, wrapper: currentWrapper, waitFor };
}

export function waitFor<T>(callback: () => T, options?: Parameters<typeof _waitFor>[1]) {
    const container = options?.container || __currentApp?.rootVm?.$el;
    return _waitFor(callback, {
        ...options,
        // @ts-expect-error $el is ok here
        container,
    });
}

const isLoading = () => __currentApp!.rootVm!.$el.querySelector('.in-loading');

export async function waitForPageLoading() {
    await waitFor(() => expect(isLoading()).toBeTruthy());
    await waitFor(() => expect(isLoading()).toBeFalsy());
}
