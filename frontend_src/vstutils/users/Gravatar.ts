// @ts-expect-error md5 has no types
import md5 from 'md5';
import { getApp } from '#vstutils/utils';
import { type ReadonlyRefOrGetter, toValue } from '@vueuse/core';
import { computed, ref } from 'vue';

const DEFAULT_GRAVATAR_URL = 'https://www.gravatar.com/avatar/[email_hash]?d=mp';

export default class Gravatar {
    base_url: string;
    default_gravatar: string;

    constructor(opt: { base_url?: string } = {}) {
        const settings = getApp().schema.info['x-settings'];
        this.base_url = opt.base_url || settings.gravatar_url || DEFAULT_GRAVATAR_URL;
        this.default_gravatar = settings.static_path + 'img/anonymous.png';
    }

    getDefaultGravatar() {
        return this.default_gravatar;
    }

    getGravatarByEmail(email: string | undefined | null) {
        if (!email) {
            return this.getDefaultGravatar();
        }
        return this.base_url.replace('[email_hash]', md5(email));
    }
}

export function useGravatarUrl(email: ReadonlyRefOrGetter<string | undefined | null>) {
    const gravatar = new Gravatar();
    const useDefaultGravatar = ref(false);
    const gravatarUrl = computed(() => {
        if (useDefaultGravatar.value) {
            return gravatar.getDefaultGravatar();
        }
        return gravatar.getGravatarByEmail(toValue(email));
    });
    return {
        gravatarUrl,
        handleGravatarError: () => {
            useDefaultGravatar.value = true;
        },
    };
}
