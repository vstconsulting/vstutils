import Vue from "vue";
window.Vue = Vue;

import VueRouter from "vue-router";
window.VueRouter = VueRouter;

import Vuex from "vuex";
window.Vuex = Vuex;

import VueI18n from "vue-i18n";
window.VueI18n = VueI18n;

Vue.use(VueRouter);
Vue.use(Vuex);
Vue.use(VueI18n);
