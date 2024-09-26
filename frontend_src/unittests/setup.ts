import $ from 'jquery';
import createFetchMock from 'vitest-fetch-mock';
import { vi } from 'vitest';
import QRCode from 'qrcode';
// @ts-expect-error No types here :(
import Vue from 'vue/dist/vue.runtime.common.dev.js';

// Hide annoying Vue messages
Vue.config.productionTip = false;
Vue.config.devtools = false;

// @ts-expect-error Mock canvas
// eslint-disable-next-line @typescript-eslint/no-empty-function
QRCode.toCanvas = () => {};

// @ts-expect-error Skip some properties
global.$ = global.jQuery = $;

// @ts-expect-error Mock adminlte jquery functions
// eslint-disable-next-line @typescript-eslint/no-empty-function
$.fn.PushMenu = () => {};

globalThis.IS_TESTS = true;
globalThis.DISABLE_AUTO_UPDATE = globalThis.IS_TESTS;

// @ts-expect-error Skip some properties
globalThis.OBJECT_URL = 'blob:http://test.vst/a757db77-eeca-4c26-b0f7-9bb2813c0577';

const fetchMocker = createFetchMock(vi);
// sets globalThis.fetch and globalThis.fetchMock to our mocked version
fetchMocker.enableMocks();

if (typeof window.URL.createObjectURL === 'undefined') {
    // @ts-expect-error Skip some properties
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    window.URL.createObjectURL = vi.fn(() => globalThis.OBJECT_URL);
}

if (typeof window.URL.revokeObjectURL === 'undefined') {
    window.URL.revokeObjectURL = vi.fn();
}
