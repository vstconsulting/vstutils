import Vue, { computed } from 'vue';
import { joinPaths, pathToArray, capitalize, ViewTypes, getApp } from './utils';
// TODO import type { View } from './views';

export interface Breadcrumb {
    link?: string;
    name?: string;
    iconClasses?: string;
}

export function getBreadcrumb(view: any, fragment: string): Breadcrumb {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (view.type === ViewTypes.PAGE_NEW) {
        return { iconClasses: 'fas fa-plus' };
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (view.type === ViewTypes.PAGE_EDIT && !view.isEditStyleOnly) {
        return { iconClasses: 'fas fa-pen' };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    return { name: view.pkParamName ? capitalize(fragment) : view.title };
}

export const useBreadcrumbs = () => {
    const app = getApp();
    const rootVm = app.rootVm as Vue;

    return computed(() => {
        const dt = pathToArray(rootVm.$route.path);
        const crumbs: Breadcrumb[] = [{ iconClasses: 'fas fa-home', link: '/' }];
        for (let i = 0; i < dt.length; i++) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const { route } = app.router.resolve(joinPaths(...dt.slice(0, i + 1)));
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const view = route.meta?.view;
            if (view) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                crumbs.push({ link: i === dt.length - 1 ? null : route.path, ...getBreadcrumb(view, dt[i]) });
            }
        }

        if (crumbs.length > 4) {
            return [...crumbs.slice(0, 2), { name: '...' }, ...crumbs.slice(-2)];
        }
        return crumbs;
    });
};
