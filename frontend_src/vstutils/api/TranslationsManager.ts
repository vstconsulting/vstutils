import type { Cache } from '@/cache';
import type { LocaleMessageObject } from 'vue-i18n';
import { type InitAppConfig } from '@/vstutils/init-app';

export interface Language {
    code: string;
    name: string;
}

/**
 * Class for requesting translations related data
 */
export class TranslationsManager {
    cache: Cache;
    config: InitAppConfig;

    constructor(config: InitAppConfig) {
        this.cache = config.cache;
        this.config = config;
    }

    async loadLanguages(): Promise<Language[]> {
        const response = await fetch(
            new Request(new URL(this.config.api.endpointPath, this.config.api.url), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([{ method: 'GET', path: ['_lang'] }]),
            }),
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const data = (await response.json())[0].data as { results: Language[] };
        return data.results;
    }

    /**
     * Method, that gets list of App languages from cache.
     */
    async getLanguages(): Promise<Language[]> {
        const cached = await this.cache.getJson<Language[]>('languages');
        if (cached) {
            return cached;
        }

        const languages = await this.loadLanguages();
        await this.cache.set('languages', JSON.stringify(languages));
        return languages;
    }

    /**
     * Method, that loads translations for some language from API.
     */
    async loadTranslations(lang: string): Promise<LocaleMessageObject> {
        const response = await fetch(
            new Request(new URL(this.config.api.endpointPath, this.config.api.url), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([{ method: 'GET', path: ['_lang', lang] }]),
            }),
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const data = (await response.json())[0].data as { translations: LocaleMessageObject };
        return data.translations;
    }

    /**
     * Method, that gets translations for some language.
     * @param {string} lang - Code of language, translations of which to load.
     * @return {Promise.<LocaleMessageObject>}
     */
    async getTranslations(lang: string): Promise<LocaleMessageObject> {
        if (this.cache) {
            const cached = await this.cache.getJson<LocaleMessageObject>('translations.' + lang);
            if (cached) {
                return cached;
            }
        }
        const translations = await this.loadTranslations(lang);
        await this.cache.set('translations.' + lang, JSON.stringify(translations));
        return translations;
    }
}
