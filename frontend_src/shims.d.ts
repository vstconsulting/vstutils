import Vue from 'vue';
import type { App } from './spa.js';

declare module 'vue/types/vue' {
    interface VueConstructor {
        $app: App;
        $st(text: string): string;
    }
}

declare module 'vue/types/vue' {
    interface Vue {
        $app: App;
        $st(text: string): string;
    }
}

declare module 'vue/types/options' {
    interface ComponentOptions<V extends Vue> {
        app?: App;
    }
}

declare global {
    interface String {
        format(args: any[]): string;
    }
    interface Array<T> {
        get last(): T;
    }
}
