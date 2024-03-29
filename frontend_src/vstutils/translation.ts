import VueI18n from 'vue-i18n';
import '../libs/vue.js';
import { getCookie, capitalize } from './utils/todo';

export const RUPluralizationRule = (choice: number, choicesLength: number) => {
    if (choice === 0) {
        return 0;
    }

    const teen = choice > 10 && choice < 20;
    const endsWithOne = choice % 10 === 1;

    if (choicesLength < 4) {
        return !teen && endsWithOne ? 1 : 2;
    }
    if (!teen && endsWithOne) {
        return 1;
    }
    if (!teen && choice % 10 >= 2 && choice % 10 <= 4) {
        return 2;
    }

    return choicesLength < 4 ? 2 : 3;
};

declare module 'vue-i18n' {
    export default class VueI18n {
        /**
         * If translation doesn't exist, checks if translation for lowercased text exists and returns it capitalized,
         * also null and undefined are converted to empty string
         */
        st(text: string | null | undefined): string;
        /**
         * Works the same as `t` but always converts result to string
         */
        ts(key: VueI18n.Path, values?: VueI18n.Values): string;
    }
}

VueI18n.prototype.st = function st(text: string | null | undefined): string {
    if (text === undefined || text === null) {
        return '';
    }

    text = String(text);

    if (this.te(text)) {
        return this.t(text) as string;
    }

    const lower = text.toLowerCase();
    if (this.te(lower)) {
        return capitalize(this.t(lower) as string);
    }

    return text;
};

VueI18n.prototype.ts = function ts(key: VueI18n.Path, values?: VueI18n.Values): string {
    return String(this.t(key, values));
};

export const i18n = new VueI18n({
    locale: document.documentElement.lang || getCookie('lang') || 'en',
    messages: {},
    silentTranslationWarn: true,
    formatFallbackMessages: true,
    pluralizationRules: {
        ru: RUPluralizationRule,
    },
});
