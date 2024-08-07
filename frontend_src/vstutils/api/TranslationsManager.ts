import type { LocaleMessageObject } from 'vue-i18n';
import { type InitAppConfig } from '#vstutils/init-app';
import { createBulkApiFetch, type BulkApiFetch } from '#vstutils/bulk';

export interface Language {
    code: string;
    name: string;
}

export class TranslationsManager {
    bulk: BulkApiFetch;

    constructor(config: InitAppConfig) {
        this.bulk = createBulkApiFetch({ config });
    }

    async loadLanguages(): Promise<Language[]> {
        const { data } = await this.bulk<{ results: Language[] }>({
            method: 'GET',
            path: ['_lang'],
        });
        return data.results;
    }

    /**
     * Method, that loads translations for some language from API.
     */
    async loadTranslations(lang: string): Promise<LocaleMessageObject> {
        const { data } = await this.bulk<{ translations: LocaleMessageObject }>({
            method: 'GET',
            path: ['_lang', lang],
        });
        return data.translations;
    }
}
