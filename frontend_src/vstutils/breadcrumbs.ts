import { computed } from 'vue';
import type { Model } from './models';
import { getApp } from './utils';

export interface Breadcrumb {
    link?: string;
    name?: string;
    iconClasses?: string;
}

export const useBreadcrumbs = () => {
    const app = getApp();

    return computed(() => {
        if (app.rootVm.$route.name === 'home') {
            return [];
        }

        const crumbs: Breadcrumb[] = [{ iconClasses: 'fas fa-home', link: '/' }];
        for (const { view, path, state } of app.store.viewItems) {
            let link = path;
            let name = view.title;
            let iconClasses = '';

            if (view.isNewPage()) {
                name = '';
                link = '';
                iconClasses = 'fas fa-plus';
            } else if (view.isEditPage() && !view.isEditStyleOnly) {
                name = '';
                link = '';
                iconClasses = 'fas fa-pen';
            } else if (view.isDetailPage() && view.useViewFieldAsTitle) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                const instanceName = (state as { instance?: Model }).instance?.getViewFieldString(false);
                if (instanceName) {
                    name = instanceName;
                }
            }

            crumbs.push({ link, name, iconClasses });
        }

        crumbs.at(-1)!.link = '';

        if (crumbs.length > 4) {
            return [...crumbs.slice(0, 2), { name: '...' }, ...crumbs.slice(-2)];
        }
        return crumbs;
    });
};
