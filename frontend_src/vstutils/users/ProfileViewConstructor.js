import $ from 'jquery';
import { path_pk_key } from '../utils';
import { View } from '../views';

export default class ProfileViewConstructor {
    /**
     * Constructor of ProfileViewConstructor.
     * @param {object} profile_mixins Object with props -
     * (key, value) of which equal to (profile_path, mixin).
     */
    constructor(profile_mixins) {
        this.mixins = profile_mixins;
    }
    /**
     * Method, that generates profile view and returns it.
     * @param {object} views Object with views.
     * @param {string} path Profile path.
     * @returns {View}
     */
    generateProfileView(views, path) {
        let view = views.get(path);
        let new_view = new View(view.objects.model, $.extend(true, {}, view.schema));
        let mixin = this.getBaseProfileMixin(path);

        if (this.mixins[path]) {
            mixin = $.extend(true, mixin, this.mixins[path]);
        }

        if (view.schema.type === 'page_edit') {
            // eslint-disable-next-line no-unused-vars
            mixin.methods.getRedirectUrl = function (opt) {
                return this.$route.path.replace('/edit', '');
            };
        }

        new_view.mixins = [...view.mixins];
        new_view.mixins.push(mixin);

        return new_view;
    }
    /**
     * Method, that returns base mixin for profile views.
     * @param {string} path Profile path.
     * @returns {object}.
     */
    getBaseProfileMixin(path) {
        return {
            computed: {
                url() {
                    return path
                        .replace('{' + path_pk_key + '}', window.app.api.getUserId())
                        .format(this.$route.params)
                        .replace(/\/$/g, '');
                },
            },
            methods: {
                loadParentInstanceOrNot(views, obj) {
                    if (views.get(obj.path) && views.get(obj.path).schema.type === 'list') {
                        return false;
                    }

                    return obj.path !== '/profile/';
                },

                // eslint-disable-next-line no-unused-vars
                getSubViewUrl(innerPathObj, views) {
                    return innerPathObj.url.replace('profile', 'user/' + window.app.api.getUserId());
                },
            },
        };
    }
}
