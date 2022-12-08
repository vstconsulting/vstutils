import $ from 'jquery';
import type { RawLocation } from 'vue-router';
import type { Action } from '../../../views';
import type { XMenu } from '../../../AppConfiguration';
import { getApp } from '../../../utils';

export interface MenuItem {
    name: string;
    sublinks?: MenuItem[];
    icon?: string | string[];

    to?: RawLocation;
    href?: string;
    emptyAction?: Action;
}

export function openSidebar() {
    // @ts-expect-error AdminLTE has no types
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    $('[data-widget="pushmenu"]').PushMenu('expand');
}

export function hideSidebar() {
    if (document.body.classList.contains('sidebar-open')) {
        // @ts-expect-error AdminLTE has no types
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        $('[data-widget="pushmenu"]').PushMenu('collapse');
    }
}

export function convertXMenuToSidebar(xMenu: XMenu): MenuItem[] {
    const app = getApp();
    const menu: MenuItem[] = [];

    for (const item of xMenu) {
        let emptyAction: Action | undefined;
        if (!item.origin_link && item.url) {
            const fragments = item.url.split('/').filter(Boolean);
            if (fragments.length > 1) {
                const viewPath = `/${fragments.slice(0, -1).join('/')}/`;
                const actionName = fragments.at(-1);
                const action = app.views.get(viewPath)?.actions.get(actionName!);
                if (action?.isEmpty) {
                    emptyAction = action;
                }
            }
        }

        const link = {
            name: item.name,
            icon: item.span_class,
            sublinks: convertXMenuToSidebar(item.sublinks ?? []),
        } as MenuItem;

        if (emptyAction) {
            link.emptyAction = emptyAction;
        } else if (item.origin_link) {
            link.href = item.url;
        } else {
            link.to = item.url;
        }

        menu.push(link);
    }

    return menu;
}
