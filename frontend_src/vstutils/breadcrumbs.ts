import Vue, { computed } from 'vue';
import { joinPaths, pathToArray, capitalize, ViewTypes, getApp } from './utils';
import { View, PageEditView, PageView } from './views';

export interface Breadcrumb {
    link?: string;
    name?: string;
    iconClasses?: string;
}

export function getBreadcrumb(view: View, fragment: string): Breadcrumb {
    if (view.type === ViewTypes.PAGE_NEW) {
        return { iconClasses: 'fas fa-plus' };
    }
    if (view.type === ViewTypes.PAGE_EDIT && !(view as PageEditView).isEditStyleOnly) {
        return { iconClasses: 'fas fa-pen' };
    }

    return { name: (view as PageView).pkParamName ? capitalize(fragment) : view.title };
}

export const useBreadcrumbs = () => {
    const app = getApp();
    const rootVm = app.rootVm as Vue;

    return computed(() => {
        const dt = pathToArray(rootVm.$route.path);
        const crumbs: Breadcrumb[] = [{ iconClasses: 'fas fa-home', link: '/' }];
        for (let i = 0; i < dt.length; i++) {
            const { route } = app.router.resolve(joinPaths(...dt.slice(0, i + 1)));
            const view = route.meta?.view as View | undefined;
            if (view) {
                crumbs.push({
                    link: i === dt.length - 1 ? undefined : route.path,
                    ...getBreadcrumb(view, dt[i]),
                });
            }
        }

        if (crumbs.length > 4) {
            return [...crumbs.slice(0, 2), { name: '...' }, ...crumbs.slice(-2)];
        }
        return crumbs;
    });
};
