import Vue from 'vue';
import { capitalize } from './utils';

/**
 * Setting of global Vue filter - capitalize.
 */
Vue.filter('capitalize', capitalize);
/**
 * Setting of global Vue filter - split - replacing "_" on " ".
 */
Vue.filter('split', function (value) {
    if (!value) {
        return '';
    }
    return value.replace(/_/g, ' ');
});

/**
 * Setting of global Vue filter - lower - returns string in lower case.
 */
Vue.filter('lower', function (value) {
    if (!value) {
        return '';
    }
    value = value.toString();
    return value.toLowerCase();
});

/**
 * Setting of global Vue filter - upper - returns string in upper case.
 */
Vue.filter('upper', function (value) {
    if (!value) {
        return '';
    }
    value = value.toString();
    return value.toUpperCase();
});
