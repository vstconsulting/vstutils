import { getApp } from '@/vstutils/utils';
import { mount as vueMount } from '@vue/test-utils';

import type { ComponentOptions } from 'vue';

export * from './create-app';
export * from './schema';
export * from './open-page';

export function mount(component: ComponentOptions<Vue>) {
    const app = getApp();
    return vueMount(component, { localVue: app.vue, i18n: app.i18n, router: app.router });
}
