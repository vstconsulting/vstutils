import jQuery from 'jquery';
import select2 from 'select2/dist/js/select2.full.min.js';

let $ = jQuery;
if (typeof jQuery.default === 'function') {
    $ = jQuery.default;
}

window.jQuery = $;
window.$ = $;

if (typeof $.prototype.select2 !== 'function') {
    select2($);
}

export default $;
