import { mount as vueMount, createWrapper, type Wrapper } from '@vue/test-utils';
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

export function expectRequest(
    request: undefined | Request | [string | Request | undefined, RequestInit | undefined],
    expected: { url?: string; method?: string; body: string | object; headers?: Record<string, string> },
) {
    if (!request) {
        throw new Error('Request expected');
    }
    if (Array.isArray(request)) {
        if (request[0] instanceof Request) {
            request = request[0];
        } else {
            // @ts-expect-error It's actually a Request
            request = new Request(request);
        }
    }
    if (expected.url) {
        expect(request.url).toBe(expected.url);
    }
    if (expected.method) {
        expect(request.method).toBe(expected.method.toUpperCase());
    }
    if (expected.body) {
        expect(request.body).toBeTruthy();
        // @ts-expect-error It's actually a Buffer
        const body = (request.body as Buffer).toString();
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

export function expectNthRequest(
    idx: number,
    expected: { url?: string; method?: string; body: string | object; headers?: Record<string, string> },
) {
    expectRequest(fetchMockCallAt(idx), expected);
}

export function fetchMockCallAt(idx: number) {
    return fetchMock.mock.calls.at(idx);
}
