import type { IAppInitialized } from './vstutils/app';

declare module 'vue/types/vue' {
    interface Vue {
        $app: IAppInitialized;
        $st(text: string): string;
    }
}
