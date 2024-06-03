import { type UserManager } from 'oidc-client-ts';
import { provide, type InjectionKey, inject } from 'vue';
import type VueI18n from 'vue-i18n';
import { type InitAppConfig } from '@/vstutils/init-app';
import { TranslationsManager } from '../api/TranslationsManager';
import { createVueI18n } from '../translation';
import { getCookie } from '../utils';

function createProviderWithInjector<T>(name: string) {
    const key = Symbol(name) as InjectionKey<T>;
    return {
        provide: (value: T) => provide(key, value),
        inject: () => {
            const value = inject(key);
            if (!value) {
                throw new Error(`${name} is not provided`);
            }
            return value;
        },
    };
}

export const { provide: provideOauth2UserManager, inject: useOauth2UserManager } =
    createProviderWithInjector<UserManager>('UserManager');

export const { provide: provideMainAppOpener, inject: useMainAppOpener } =
    createProviderWithInjector<() => void>('mainAppOpener');

export const { provide: provideTranslationsManager, inject: useTranslationsManager } =
    createProviderWithInjector<{
        i18n: VueI18n;
        availableLanguages: { code: string; name: string }[];
        setLanguage: (code: string) => Promise<void>;
    }>('TranslationManager');

export const { provide: provideInitAppConfig, inject: useInitAppConfig } =
    createProviderWithInjector<InitAppConfig>('InitAppConfig');

export async function createTranslationsManager(config: InitAppConfig) {
    const baseTranslationsManager = new TranslationsManager(config);
    const i18n = createVueI18n();
    const availableLanguages = await baseTranslationsManager.getLanguages();
    i18n.locale = document.documentElement.lang || getCookie('lang') || availableLanguages[0]?.code || 'en';
    if (availableLanguages.length > 0) {
        i18n.setLocaleMessage(i18n.locale, await baseTranslationsManager.getTranslations(i18n.locale));
    }
    return {
        availableLanguages,
        i18n,
        async setLanguage(code: string) {
            i18n.locale = code;
            i18n.setLocaleMessage(code, await baseTranslationsManager.getTranslations(code));
        },
    };
}
