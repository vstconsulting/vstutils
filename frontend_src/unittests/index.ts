import { mount as vueMount, createWrapper, type Wrapper } from '@vue/test-utils';
import { waitFor as _waitFor, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { getApp, streamToString } from '#vstutils/utils';

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

export function useTestCtx() {
    if (!__currentApp) {
        throw new Error('App is not created');
    }
    // @ts-expect-error __currentApp is set
    const wrapper: Wrapper<Vue> = createWrapper(__currentApp._mounted);
    const doc = wrapper.vm.$el.ownerDocument;
    const user = userEvent.setup({ document: doc });
    const screen = within(doc.body);

    return { app: getApp(), screen, user, wrapper, waitFor };
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

export async function expectRequest(
    params: undefined | Parameters<typeof global.fetch>,
    expected: { url?: string; method?: string; body: string | object; headers?: Record<string, string> },
) {
    if (!params) {
        throw new Error('Request expected');
    }
    const request = new Request(...params);
    if (expected.url) {
        expect(request.url).toBe(expected.url);
    }
    if (expected.method) {
        expect(request.method.toUpperCase()).toBe(expected.method.toUpperCase());
    }
    if (expected.body) {
        expect(request.body).toBeTruthy();
        const body = request.body ? await streamToString(request.body) : '';
        if (typeof expected.body === 'object') {
            expect(JSON.parse(body)).toEqual(expected.body);
        } else {
            expect(body).toBe(expected.body);
        }
    }
    if (expected.headers) {
        const headers = request.headers;
        for (const [key, value] of Object.entries(expected.headers)) {
            expect(headers.get(key)).toBe(value);
        }
    }
}

export async function expectNthRequest(
    idx: number,
    expected: { url?: string; method?: string; body: string | object; headers?: Record<string, string> },
) {
    await expectRequest(fetchMockCallAt(idx), expected);
}

export function fetchMockCallAt(idx: number) {
    return fetchMock.mock.calls.at(idx);
}

/**
 * Helper used to find bulk requests that were left from previous tests.
 * Such requests must be awaited and properly mocked in tests that called them.
 */
export function assertNoCollectedBulksInApiConnector() {
    const collectedBulks = getApp()
        .api.bulk!._getCollectedBulks()
        .map(({ request }) => request);

    if (collectedBulks.length > 0) {
        throw new Error(`Collected bulks left: ${JSON.stringify(collectedBulks, null, 2)}`);
    }
}
