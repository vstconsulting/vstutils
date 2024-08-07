import type { IAppInitialized } from './vstutils/app';
import type * as utils from '#vstutils/utils';
import type { CustomVueI18n } from './vstutils/translation';

declare module 'vue/types/vue' {
    interface Vue {
        $app: IAppInitialized;
        $st: CustomVueI18n['st'];
        $ts: CustomVueI18n['ts'];
        $u: typeof utils;
    }
}
