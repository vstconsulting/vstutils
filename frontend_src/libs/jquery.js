import jQuery from 'jquery';

// For jest tests
let $ = jQuery;
if (typeof jQuery.default === 'function') {
    $ = jQuery.default;
}

window.jQuery = $;
window.$ = $;

const select2 = require('select2');

// For jest tests
if (typeof $.prototype.select2 !== 'function') {
    select2($);
}

export default $;
