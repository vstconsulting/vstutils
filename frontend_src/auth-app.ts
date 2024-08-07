export { createAuthAppFactory, type AuthAppFactory } from './vstutils/auth-app';
export { default as LangForm } from './vstutils/default-auth-app/components/LangForm.vue';
export {
    createTranslationsManager,
    provideTranslationsManager,
    useTranslationsManager,
} from './vstutils/default-auth-app/helpers';
export {
    createBaseAuthApp,
    createDefaultAuthApp,
    customizeDefaultAuthAppCreator,
} from './vstutils/default-auth-app/index';
