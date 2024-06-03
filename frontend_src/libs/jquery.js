import jQuery from 'jquery';
import select2 from 'select2';

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
