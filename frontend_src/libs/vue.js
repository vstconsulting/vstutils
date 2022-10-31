import Vue from 'vue';
import * as Vue27 from 'vue';
window.Vue = Vue;
window.Vue27 = Vue27;

import VueI18n from 'vue-i18n';
window.VueI18n = VueI18n;
Vue.use(VueI18n);

import * as pinia from 'pinia';
window.pinia = pinia;
Vue.use(pinia.PiniaVuePlugin);

import PortalVue from 'portal-vue';
window.PortalVue = PortalVue;
Vue.use(PortalVue);

Vue.directive('element-bound', {
    bind(el, { value: callback }) {
        callback(el);
    },
});

export { Vue, VueI18n, PortalVue };
