import type { IAppInitialized } from './vstutils/app';
import type * as utils from '@/vstutils/utils';

declare module 'vue/types/vue' {
    interface Vue {
        $app: IAppInitialized;
        $st(text: string): string;
        $u: typeof utils;
    }
}
