import Vue from 'vue';

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

export { Vue, PortalVue };
