/**
 * @typedef {Object} Language
 * @property {string} code
 * @property {string} name
 */

/**
 * Class for requesting translations related data
 */
export class TranslationsManager {
    /**
     * @param {ApiConnector} api
     * @param {FakeCache} cache
     */
    constructor(api, cache) {
        this.api = api;
        this.cache = cache;
    }

    /**
     * Method, that loads list of App languages from API.
     * @return {Promise.<Language[]>}
     */
    loadLanguages() {
        return this.api.bulkQuery({ path: '/_lang/', method: 'get' }).then((response) => {
            return response.data.results;
        });
    }

    /**
     * Method, that gets list of App languages from cache.
     * @return {Promise.<Language[]>}
     */
    async getLanguagesFromCache() {
        try {
            const response = await this.cache.get('languages');
            return JSON.parse(response.data);
        } catch (error) {
            const languages = await this.loadLanguages();
            this.cache.set('languages', JSON.stringify(languages));
            return languages;
        }
    }

    /**
     * Method, that gets list of App languages.
     * @return {Promise.<Language[]>}
     */
    getLanguages() {
        if (this.cache) {
            return this.getLanguagesFromCache();
        }
        return this.loadLanguages();
    }

    /**
     * Method, that loads translations for some language from API.
     * @param {string} lang Code of language, translations of which to load.
     * @return {Promise.<Object>}
     */
    loadTranslations(lang) {
        return this.api.bulkQuery({ path: ['_lang', lang], method: 'get' }).then((response) => {
            return response.data.translations;
        });
    }

    /**
     * Method, that gets translations for some language from cache.
     * @param {string} lang - Code of language, translations of which to load.
     * @return {Promise.<Object>}
     */
    async getTranslationsFromCache(lang) {
        try {
            const response = await this.cache.get('translations.' + lang);
            return JSON.parse(response.data);
        } catch (error) {
            const translations = await this.loadTranslations(lang);
            this.cache.set('translations.' + lang, JSON.stringify(translations));
            return translations;
        }
    }

    /**
     * Method, that gets translations for some language.
     * @param {string} lang - Code of language, translations of which to load.
     * @return {Promise.<Object>}
     */
    getTranslations(lang) {
        if (this.cache) {
            return this.getTranslationsFromCache(lang);
        }
        return this.loadTranslations(lang);
    }
}
