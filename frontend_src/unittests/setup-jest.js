import $ from 'jquery';
global.$ = global.jQuery = $;

// Mock adminlte jquery functions
$.fn.PushMenu = () => {};

globalThis.IS_TESTS = true;
globalThis.DISABLE_AUTO_UPDATE = globalThis.IS_TESTS;
