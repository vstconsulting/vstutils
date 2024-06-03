import Vue from 'vue';

import VueI18n from 'vue-i18n';
window.VueI18n = VueI18n;

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

Vue.config.productionTip = false;

export { Vue, VueI18n, PortalVue };
