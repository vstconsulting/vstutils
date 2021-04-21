import { ViewTypes } from '../utils';
import FiltersModal from '../components/list/FiltersModal.vue';
import AddChildModal from '../components/list/AddChildModal.vue';

/**
 * Dictionary, that contains names of openapi schema attributes.
 * This dictionary is needed for easier updates of following opeanapi versions,
 * that can contain another attributes names.
 */
const openapi_dictionary = {
    models: {
        name: 'definitions',
        fields: {
            name: 'properties',
        },
        required_fields: {
            name: 'required',
        },
        ref_names: ['$ref', 'definition_ref'],
        filters_to_delete: ['limit', 'offset'],
    },
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
                    titleClasses: ['d-none', 'd-lg-inline-block'],
                    classes: ['btn', 'btn-danger'],
                    isEmpty: true,
                    isMultiAction: true,
                    styles: { order: 100, marginLeft: 'auto' },
                    doNotGroup: true,
                },
            },
            list: {
                new: {
                    name: 'new',
                    title: 'Create',
                    iconClasses: ['fas', 'fa-plus'],
                    titleClasses: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                    styles: { order: -10 },
                    doNotGroup: true,
                },
                add: {
                    name: 'add',
                    title: 'Add',
                    component: AddChildModal,
                    styles: { order: -10 },
                    doNotGroup: true,
                },
                filters: {
                    name: 'filters',
                    title: '',
                    iconClasses: ['fas', 'fa-filter'],
                    component: FiltersModal,
                    styles: { order: -20 },
                    doNotGroup: true,
                },
            },
            page: {
                edit: {
                    name: 'edit',
                    title: 'Edit',
                    iconClasses: ['fas', 'fa-edit'],
                    titleClasses: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                    styles: { order: -8 },
                    doNotGroup: true,
                },
            },
            page_new: {
                save_new: {
                    name: 'save',
                    title: 'Save',
                    iconClasses: ['fas', 'fa-save'],
                    titleClasses: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                    styles: { order: -10 },
                    doNotGroup: true,
                },
            },
            page_edit: {
                save: {
                    name: 'save',
                    title: 'Save',
                    iconClasses: ['fas', 'fa-save'],
                    titleClasses: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                    doNotShowOnList: true,
                    styles: { order: -9 },
                    doNotGroup: true,
                },
                reload: {
                    name: 'reload',
                    title: 'Reload',
                    iconClasses: ['fas', 'fa-sync-alt'],
                    titleClasses: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                    doNotShowOnList: true,
                    styles: { order: -8 },
                    doNotGroup: true,
                },
                cancel: {
                    name: 'cancel',
                    title: 'Cancel',
                    classes: ['btn', 'btn-secondary'],
                    iconClasses: ['fas', 'fa-chevron-left'],
                    titleClasses: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                    doNotShowOnList: true,
                    styles: { order: 100, marginLeft: 'auto' },
                    doNotGroup: true,
                },
            },
            action: {
                execute: {
                    name: 'execute',
                    styles: { order: -7 },
                    doNotGroup: true,
                },
            },
        },
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

export default openapi_dictionary;
