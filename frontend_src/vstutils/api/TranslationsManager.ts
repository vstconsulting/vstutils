import type { Cache } from '@/cache';
import { LocaleMessageObject } from 'vue-i18n';
import { HttpMethods } from '../utils';

export interface Language {
    code: string;
    name: string;
}

import { ApiConnector } from './ApiConnector';

/**
 * Class for requesting translations related data
 */
export class TranslationsManager {
    api: ApiConnector;
    cache: Cache;

    constructor(api: ApiConnector, cache: Cache) {
        this.api = api;
        this.cache = cache;
    }

    loadLanguages(): Promise<Language[]> {
        return this.api
            .bulkQuery<{ results: Language[] }>({ path: '/_lang/', method: HttpMethods.GET })
            .then((response) => response.data.results);
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
    loadTranslations(lang: string): Promise<LocaleMessageObject> {
        return this.api
            .bulkQuery<{ translations: LocaleMessageObject }>({
                path: ['_lang', lang],
                method: HttpMethods.GET,
            })
            .then((response) => response.data.translations);
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
