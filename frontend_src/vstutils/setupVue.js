import Vue from 'vue';
import VueI18n from 'vue-i18n';
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

/**
 * Saving default 'getChoiceIndex' method to defGetChoiceIndex.
 * @type {VueI18n.getChoiceIndex|*}
 */
VueI18n.prototype.defGetChoiceIndex = VueI18n.prototype.getChoiceIndex;

/**
 * Customization of getChoiceIndex method.
 * @param choice
 * @param choicesLength
 * @return {number}
 */
VueI18n.prototype.getChoiceIndex = function (choice, choicesLength) {
    if (this.locale !== 'ru') {
        this.defGetChoiceIndex(choice, choicesLength);
    }

    if (choice === 0) {
        return 0;
    }

    if (choice > 100) {
        choice = Number(choice.toString().slice(-2));
    }

    const teen = choice > 10 && choice < 20;
    const endsWithOne = choice % 10 === 1;

    if (!teen && endsWithOne) {
        return 1;
    }

    if (!teen && choice % 10 >= 2 && choice % 10 <= 4) {
        return 2;
    }

    return choicesLength < 4 ? 2 : 3;
};
