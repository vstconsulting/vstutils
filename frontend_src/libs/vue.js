import Vue from 'vue';
window.Vue = Vue;

import VueRouter from 'vue-router';
window.VueRouter = VueRouter;
Vue.use(VueRouter);

import Vuex from 'vuex';
window.Vuex = Vuex;
Vue.use(Vuex);

import VueI18n from 'vue-i18n';
window.VueI18n = VueI18n;
Vue.use(VueI18n);

import PortalVue from 'portal-vue';
window.PortalVue = PortalVue;
Vue.use(PortalVue);
