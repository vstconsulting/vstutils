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
                    title: 'remove',
                    icon_classes: ['fas', 'fa-trash-alt'],
                    title_classes: ['d-none', 'd-lg-inline-block'],
                    classes: ['btn-danger', 'danger-right'],
                },
            },
            list: {
                new: {
                    name: 'new',
                    title: 'create',
                    icon_classes: ['fas', 'fa-plus'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                },
                add: {
                    name: 'add',
                    title: 'add',
                    component: 'gui_add_child_modal',
                },
            },
            page: {
                edit: {
                    name: 'edit',
                    title: 'edit',
                    icon_classes: ['fas', 'fa-edit'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                },
            },
            page_new: {
                save_new: {
                    name: 'save',
                    title: 'save',
                    icon_classes: ['fas', 'fa-save'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                },
            },
            page_edit: {
                save: {
                    name: 'save',
                    title: 'save',
                    icon_classes: ['fas', 'fa-save'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                },
                reload: {
                    name: 'reload',
                    title: 'reload',
                    icon_classes: ['fas', 'fa-sync-alt'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                },
            },
            action: {
                execute: {
                    name: 'execute',
                    title: 'send',
                    icon_classes: ['fas', 'fa-upload'],
                    title_classes: ['d-none', 'd-lg-inline-block', 'title-for-btn'],
                },
            },
        },
        multi_actions: ['remove'],
        types_operations_always_to_add: ['page_new', 'page_edit', 'action'],
    },
    schema_types: {
        /**
         * Description of possible properties of some schema type:
         * 'some_schema_type': {
         *     query_type: "post|get|put|patch|delete",         // method of http request, that will be used for API request from view instance
         *     url_postfix: "{string}",                         // postfix, that will be added to view instance URL
         *     type: "{string}",                                // type of view, that will be added to the view's schema
         *     autoupdate: "{boolean}",                         // if true, view instance will automatically send API requests for getting fresh data
         *     hidden: "{boolean}",                             // if true, it means, that views of this type should not be added to the final views dict (they will be removed)
         *     do_not_connect_with_another_views: "{boolean}",  // if true, it means, that views of this type should not be added as sublinks or actions to another views.
         * }
         */
        _add: {
            query_type: 'post',
            url_postfix: 'new/',
            type: 'page_new',
        },
        _list: {
            query_type: 'get',
            url_postfix: '',
            // name of property from OpenAPI schema, where filters can be find.
            filters: { name: 'parameters' },
            type: 'list',
            autoupdate: true,
        },
        _get: {
            query_type: 'get',
            url_postfix: '',
            type: 'page',
            autoupdate: true,
        },
        _edit: {
            query_type: 'patch',
            url_postfix: 'edit/',
            type: 'page_edit',
        },
        _update: {
            query_type: 'put',
            url_postfix: 'edit/',
            type: 'page_edit',
        },
        _remove: {
            query_type: 'delete',
            url_postfix: 'remove/',
            type: 'page_remove',
            hidden: true,
        },
    },
};

export default openapi_dictionary;
