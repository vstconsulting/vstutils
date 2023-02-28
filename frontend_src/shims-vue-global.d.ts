import type { IAppInitialized } from './vstutils/app';
import type * as utils from '@/vstutils/utils';
import type VueI18n from 'vue-i18n';

declare module 'vue/types/vue' {
    interface Vue {
        $app: IAppInitialized;
        $st: VueI18n['st'];
        $ts: VueI18n['ts'];
        $u: typeof utils;
    }
}
