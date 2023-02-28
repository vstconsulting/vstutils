import { getApp, ViewTypes } from '@/vstutils/utils';

import type {
    Action,
    ActionView,
    IView,
    ListView,
    PageEditView,
    PageNewView,
    PageView,
    ViewStore,
} from './View';

type Operations = Record<string, Record<string, Action>>;

const getStore = <T extends IView>() => getApp().store.page as ViewStore<T>;

/**
 * Dictionary, that contains names of openapi schema attributes.
 * This dictionary is needed for easier updates of following openapi versions,
 * that can contain another attributes names.
 */
export const openapi_dictionary = {
    paths: {
        name: 'paths',
        operation_id: {
            name: 'operationId',
        },
        operations: {
            base: {
                remove: {
                    name: 'remove',
                    title: 'Remove',
                    iconClasses: ['fas', 'fa-trash-alt'],
                    classes: ['btn', 'btn-danger'],
                    isMultiAction: true,
                    style: { order: 100, marginLeft: 'auto' },
                    doNotGroup: true,
                    confirmationRequired: true,
                    isEmpty: true,
                    handler: (...args) =>
                        // @ts-expect-error Instance
                        getStore<PageView>().removeInstance(...args),
                    handlerMany: (...args) => getStore<ListView>().removeInstances(...args),
                },
                nested_remove: {
                    name: 'remove',
                    title: 'Remove',
                    iconClasses: ['fas', 'fa-trash-alt'],
                    classes: ['btn', 'btn-danger'],
                    isMultiAction: true,
                    style: { order: 100, marginLeft: 'auto' },
                    doNotGroup: true,
                    component: () => import('@/vstutils/components/common/NestedDeletionModal.vue'),
                },
            },
            list: {
                new: {
                    name: 'new',
                    title: 'Create',
                    appendFragment: 'new',
                    iconClasses: ['fas', 'fa-plus'],
                    style: { order: -10 },
                    doNotGroup: true,
                },
                add: {
                    name: 'add',
                    title: 'Add',
                    component: () => import('@/vstutils/components/list/AddChildModal.vue'),
                    classes: ['btn', 'btn-primary'],
                    iconClasses: ['fa', 'fa-folder-open'],
                    style: { order: -10 },
                    doNotGroup: true,
                },
                filters: {
                    name: 'filters',
                    title: '',
                    iconClasses: ['fas', 'fa-filter'],
                    component: () => import('@/vstutils/components/list/FiltersModal.vue'),
                    style: { order: -5 },
                    doNotGroup: true,
                },
            },
            page: {
                edit: {
                    name: 'edit',
                    title: 'Edit',
                    appendFragment: 'edit',
                    iconClasses: ['fas', 'fa-edit'],
                    style: { order: -8 },
                    doNotGroup: true,
                },
                filters: {
                    name: 'filters',
                    title: '',
                    iconClasses: ['fas', 'fa-filter'],
                    component: () => import('@/vstutils/components/page/FiltersModalDetail.vue'),
                    style: { order: -5 },
                    doNotGroup: true,
                },
            },
            page_new: {
                save_new: {
                    name: 'save',
                    title: 'Save',
                    iconClasses: ['fas', 'fa-save'],
                    style: { order: -10 },
                    doNotGroup: true,
                    handler: () => getStore<PageNewView>().save(),
                },
            },
            page_edit: {
                save: {
                    name: 'save',
                    title: 'Save',
                    iconClasses: ['fas', 'fa-save'],
                    doNotShowOnList: true,
                    style: { order: -9 },
                    doNotGroup: true,
                    handler: () => getStore<PageEditView>().save(),
                },
                reload: {
                    name: 'reload',
                    title: 'Reload',
                    iconClasses: ['fas', 'fa-sync-alt'],
                    doNotShowOnList: true,
                    style: { order: -8 },
                    doNotGroup: true,
                    handler: () => getStore<PageEditView>().reload(),
                },
                cancel: {
                    name: 'cancel',
                    title: 'Cancel',
                    classes: ['btn', 'btn-secondary'],
                    iconClasses: ['fas', 'fa-chevron-left'],
                    doNotShowOnList: true,
                    style: { order: 100, marginLeft: 'auto' },
                    doNotGroup: true,
                    handler: () => getStore<PageEditView>().cancel(),
                },
            },
            action: {
                execute: {
                    name: 'execute',
                    title: 'Execute',
                    style: { order: -7 },
                    doNotGroup: true,
                    handler: (...args) => getStore<ActionView>().execute(),
                },
            },
        } satisfies Operations,
        multiActions: ['remove'],
        types_operations_always_to_add: ['page_new', 'page_edit', 'action'],
    },
    /**
     * @type {Object<string, Object>}
     */
    schema_types: {
        /**
         * Description of possible properties of some schema type:
         * 'some_schema_type': {
         *     url_postfix: "{string}",                         // postfix, that will be added to view instance URL
         *     type: "{string}",                                // type of view, that will be added to the view's schema
         *     autoupdate: "{boolean}",                         // if true, view instance will automatically send API requests for getting fresh data
         *     hidden: "{boolean}",                             // if true, it means, that views of this type should not be added to the final views dict (they will be removed)
         *     do_not_connect_with_another_views: "{boolean}",  // if true, it means, that views of this type should not be added as sublinks or actions to another views.
         * }
         */
        _add: {
            urlPostfix: 'new/',
            type: ViewTypes.PAGE_NEW,
        },
        _list: {
            urlPostfix: '',
            type: ViewTypes.LIST,
            autoupdate: true,
        },
        _get: {
            urlPostfix: '',
            type: ViewTypes.PAGE,
            autoupdate: true,
        },
        _edit: {
            urlPostfix: 'edit/',
            type: ViewTypes.PAGE_EDIT,
        },
        _update: {
            urlPostfix: 'edit/',
            type: ViewTypes.PAGE_EDIT,
        },
        _remove: {
            urlPostfix: 'remove/',
            type: ViewTypes.PAGE_REMOVE,
            hidden: true,
        },
    },
};
