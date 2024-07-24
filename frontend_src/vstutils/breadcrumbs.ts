import { computed } from 'vue';
import { getApp, isNotFoundView } from '#vstutils/utils';

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
            if (isNotFoundView(view)) {
                continue;
            }
            let link = path;
            let iconClasses = '';
            // @ts-expect-error Same as view.getTitle(view.getSavedState()) so will be ok
            let name = view.getTitle(state);

            if (view.isNewPage()) {
                link = '';
                iconClasses = 'fas fa-plus';
            } else if (view.isEditPage() && !view.isEditStyleOnly) {
                link = '';
                iconClasses = 'fas fa-pen';
                name = '';
            }

            crumbs.push({ name, link, iconClasses });
        }

        crumbs.at(-1)!.link = '';

        if (crumbs.length > 4) {
            return [...crumbs.slice(0, 2), { name: '...' }, ...crumbs.slice(-2)];
        }
        return crumbs;
    });
};
