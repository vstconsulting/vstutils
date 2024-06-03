import Vue, { type Component, type AsyncComponent, h, defineAsyncComponent } from 'vue';
import VueRouter, { type RouteConfig } from 'vue-router';
import { type AuthAppFactory } from '@/vstutils/auth-app';
import {
    provideOauth2UserManager,
    provideMainAppOpener,
    provideTranslationsManager,
    provideInitAppConfig,
    createTranslationsManager,
} from './helpers';

export const createDefaultAuthApp = customizeDefaultAuthAppCreator({});

export function customizeDefaultAuthAppCreator({
    components,
}: {
    components?: {
        layout?: Component;
        loginPage?: Component;
        registrationPage?: Component;
        registrationConfirmEmailPage?: Component;
        passwordResetPage?: Component;
        passwordResetConfirmPage?: Component;
    };
}) {
    return createBaseAuthApp({
        routes: [
            {
                path: '/auth/login',
                name: 'login',
                component:
                    components?.loginPage ??
                    defineAsyncComponent(async () => (await import('./pages/Login.vue')).default),
            },
            {
                path: '/auth/registration',
                name: 'registration',
                component:
                    components?.registrationPage ??
                    defineAsyncComponent(async () => (await import('./pages/Registration.vue')).default),
            },
            {
                path: '/auth/registration/confirm-email/:code',
                name: 'registration-confirm-email',
                component:
                    components?.registrationConfirmEmailPage ??
                    defineAsyncComponent(
                        async () => (await import('./pages/RegistrationConfirmEmail.vue')).default,
                    ),
            },
            {
                path: '/auth/password-reset',
                name: 'password-reset',
                component:
                    components?.passwordResetPage ??
                    defineAsyncComponent(async () => (await import('./pages/PasswordReset.vue')).default),
            },
            {
                path: '/auth/password-reset/:uid/:token',
                name: 'password-reset-confirm',
                component:
                    components?.passwordResetConfirmPage ??
                    defineAsyncComponent(
                        async () => (await import('./pages/PasswordResetConfirm.vue')).default,
                    ),
            },
            {
                path: '*',
                redirect: { name: 'login' },
            },
        ],
        layoutComponent:
            components?.layout ??
            defineAsyncComponent(async () => (await import('./components/Layout.vue')).default),
    });
}

export function createBaseAuthApp(params: {
    routes: RouteConfig[];
    layoutComponent?: Component | AsyncComponent;
}): AuthAppFactory {
    return async ({ config, openMainApp }) => {
        Vue.use(VueRouter);

        const router = new VueRouter({
            routes: params.routes,
        });

        const { availableLanguages, i18n, setLanguage } = await createTranslationsManager(config);

        const vm = new Vue({
            setup() {
                provideOauth2UserManager(config.auth.userManager);
                provideMainAppOpener(openMainApp);
                provideInitAppConfig(config);
                provideTranslationsManager({
                    availableLanguages,
                    i18n,
                    setLanguage,
                });
                return () => {
                    if (params.layoutComponent) {
                        return h(params.layoutComponent, [h('router-view')]);
                    }
                    return h('router-view');
                };
            },
            i18n,
            router,
        });

        return {
            mount(el: HTMLElement | string) {
                vm.$mount(el);
            },
            destroy() {
                vm.$destroy();
            },
        };
    };
}
