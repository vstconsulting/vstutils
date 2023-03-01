import $ from 'jquery';
global.$ = global.jQuery = $;

// Mock adminlte jquery functions
$.fn.PushMenu = () => {};
