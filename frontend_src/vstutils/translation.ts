import Vue from 'vue';
import VueI18n, { type Values, type Path } from 'vue-i18n';
import '../libs/vue.js';
import { getCookie, capitalize } from './utils';

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

export class CustomVueI18n extends VueI18n {
    /**
     * If translation doesn't exist, checks if translation for lowercased text exists and returns it capitalized,
     * also null and undefined are converted to empty string
     */
    st(text: string | null | undefined): string {
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
    }

    /**
     * Works the same as `t` but always converts result to string
     */
    ts(key: Path, values?: Values): string {
        return String(this.t(key, values));
    }
}

export function createVueI18n() {
    return new CustomVueI18n({
        locale: document.documentElement.lang || getCookie('lang') || 'en',
        messages: {},
        silentTranslationWarn: true,
        formatFallbackMessages: true,
        pluralizationRules: {
            ru: RUPluralizationRule,
        },
    });
}

Vue.use(VueI18n);

export const i18n = createVueI18n();
