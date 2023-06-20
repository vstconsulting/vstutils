import $ from 'jquery';
global.$ = global.jQuery = $;

// Mock adminlte jquery functions
$.fn.PushMenu = () => {};

globalThis.IS_TESTS = true;
globalThis.DISABLE_AUTO_UPDATE = globalThis.IS_TESTS;

globalThis.OBJECT_URL = 'blob:http://test.vst/a757db77-eeca-4c26-b0f7-9bb2813c0577';

if (typeof window.URL.createObjectURL === 'undefined') {
    window.URL.createObjectURL = jest.fn(() => globalThis.OBJECT_URL);
}

if (typeof window.URL.revokeObjectURL === 'undefined') {
    window.URL.revokeObjectURL = jest.fn();
}
