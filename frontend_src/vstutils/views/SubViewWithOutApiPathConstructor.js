import $ from 'jquery';
import ViewConstructor from './ViewConstructor.js';
import { View } from './View.js';

/**
 * Class, that manages creation of SubViews of guiViews - views, paths of which do not exist in API,
 * but they should be in GUI.
 *
 * For example, we have some paths in API:
 * - /foo/;
 * - /foo/{pk}/;
 * - /bar/;
 * - /bar/{pk}/.
 *
 * And we do not have following paths in API:
 * - /foo/{pk}/bar/;
 * - /foo/{pk}/bar/{bar_id}/.
 *
 * But we want them exist in GUI.
 * Current class creates views for following paths.
 * All API requests from '/foo/{pk}/bar/{bar_id}/' view will be send to the '/bar/{pk}/' API path.
 */
export default class SubViewWithOutApiPathConstructor {
    /**
     * Constructor of SubViewWithOutApiPathConstructor class.
     * @param {object} openapi_dictionary Dict, that has info about properties names in OpenApi Schema
     * and some settings for views of different types.
     * @param {object} models Dict with Models.
     * @param {object} opt Object with class instance options.
     */
    constructor(openapi_dictionary, models, opt = {}) {
        this.view_constr = new ViewConstructor(openapi_dictionary, models);
        this.path_prefix = opt.prefix;
    }
    /**
     * Method, that returns new SubView object.
     * @param {object} views Dict with views objects.
     * @param {string} path Path of view, that should be cloned as SubView.
     * @param {string} new_path Path of SubView.
     */
    generateSubView(views, path, new_path) {
        let constr = this.view_constr;
        let view = views.get(path);
        let new_view = new View(view.objects.model, $.extend(true, {}, view.schema), view.template);
        let mixin = this.getSubViewMixin();

        let url = new_path.replace(this.path_prefix, '');
        new_view.objects = new_view.objects.clone({ url: url });

        new_view.schema.path = new_path;
        new_view.schema.level = constr.getViewSchema_baseOptions(new_path).level;

        new_view.mixins = [...view.mixins];
        new_view.mixins.push(mixin);

        return new_view;
    }
    /**
     * Method, that returns mixin for SubView Vue component.
     */
    getSubViewMixin() {
        let prefix = this.path_prefix;
        return {
            computed: {
                qs_url() {
                    let sub_url = prefix.format(this.$route.params);
                    return this.$route.path.replace(sub_url, '').replace('/edit', '').replace('/new', '');
                },
            },
        };
    }
}
