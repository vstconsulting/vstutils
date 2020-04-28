import $ from 'jquery';
import { findClosestPath } from '../../../utils';
import { ViewConstructor } from '../../../views';
import { openapi_dictionary } from '../../../api';
import { BaseField } from '../../base';
import FKandAPIObjectMixin from '../../FKandAPIObjectMixin.js';
import FKFieldMixin from './FKFieldMixin.js';

/**
 * FK guiField class.
 */
class FKField extends FKandAPIObjectMixin(BaseField) {
    /**
     * Method, that defines should be prefetch value loaded for current field or not.
     * @param {object} data Object with instance data.
     * @returns {boolean}
     */
    prefetchDataOrNot(data) {
        /* jshint unused: false */
        return true;
    }
    /**
     * Method, that defines: render link to another object(value of current field is connected with) or not.
     * @param {object} data Object with instance data.
     * @returns {boolean}
     */
    makeLinkOrNot(data) {
        /* jshint unused: false */
        return true;
    }
    /**
     * Method, that returns path for prefetch bulk request.
     * @param {object} raw_data Object with instance data, before loading prefetch data.
     * @param {string} qs_url Queryset url.
     */
    getObjectBulk(raw_data, qs_url) {
        /* jshint unused: false */
        let dt = this.getQuerySetFormattedUrl(raw_data)
            .replace(/^\/|\/$/g, '')
            .split('/');

        return {
            path: dt,
            id: raw_data[this.options.name],
        };
    }
    /**
     * Method, that selects one, the most appropriate queryset, from querysets array.
     * @param data {object} Object with instance data.
     * @param querysets {array} Array with field QuerySets.
     */
    getAppropriateQuerySet(data, querysets) {
        /* jshint unused: false */
        let qs = querysets;

        if (!qs) {
            qs = this.options.additionalProperties.querysets;
        }

        return qs[0];
    }
    /**
     * Method, that returns formatted url of current queryset.
     * @param data {object} Object with instance data.
     * @param params {object} Object with URL params of current path.
     * @param queryset {object} Field QuerySet.
     */
    getQuerySetFormattedUrl(data, params, queryset) {
        if (!queryset) {
            queryset = this.getAppropriateQuerySet(data);
        }

        let url = queryset.url;

        url = this.formatQuerySetUrl(url, data, params);

        return url;
    }
    /**
     * Method, that formats QuerySet's URL.
     * It changes path keys ("{pk}") on some values.
     * @param url {string} Field QuerySet's URL.
     * @param data {object} Object with instance data.
     * @param params {object} Object with URL params of current path.
     */
    formatQuerySetUrl(url = '', data = {}, params = {}) {
        if (url.indexOf('{') == -1) {
            return url;
        }

        return url.format(this.getUrlParams(url, data, params));
    }
    /**
     * Method, that forms final version of URL params for QuerySet URL.
     * @param url {string} Field QuerySet's URL.
     * @param data {object} Object with instance data.
     * @param params {object} Object with URL params of current path.
     */
    getUrlParams(url, data, params) {
        /* jshint unused: false */
        if (Object.entries(params).length !== 0) {
            return params;
        }

        if (app && app.application && app.application.$route) {
            return app.application.$route.params || {};
        }

        return {};
    }

    /**
     * Method returns string - name of 'value_field'.
     * @param data {object} Object with instance data.
     */
    getValueField(data = {}) {
        /* jshint unused: false */
        return this.options.additionalProperties.value_field;
    }

    /**
     * Method returns string - name of 'view_field'.
     * @param data {object} Object with instance data.
     */
    getViewField(data = {}) {
        /* jshint unused: false */
        return this.options.additionalProperties.view_field;
    }

    /**
     * Method returns true if prefetch_data is intended for current field (data),
     * otherwise, it returns false.
     * @param data {object} Object with instance data.
     * @param prefetch_data {object} Object with data, that was prefetch for current field.
     * @return {boolean}
     */
    isPrefetchDataForMe(data = {}, prefetch_data = {}) {
        return data[this.options.name] == prefetch_data[this.getPrefetchFilterName(data)];
    }

    /**
     * Method returns object with 2 properties:
     * - value - value of 'value_field' - value, that should be saved in DB.
     * - prefetch_value - value of 'view_field' - value, that should be displayed for user.
     * This method is supposed to be used during prefetch request -
     * request, that will be done during initial loading of field's (instance's) data.
     * @param data {object} Object with instance data.
     * @param prefetch_data {object} Object with data, that was prefetch for current field.
     * @return {{value: *, prefetch_value: *}}
     */
    getPrefetchValue(data = {}, prefetch_data = {}) {
        return {
            value: data[this.options.name],
            prefetch_value: prefetch_data[this.getViewField()],
        };
    }

    /**
     * Method returns object with 2 properties:
     * - value_field - value of 'value_field' - value, that should be saved in DB.
     * - view_field - value of 'view_field' - value, that should be displayed for user.
     * This method is supposed to be used in edit mode,
     * when user selects one of the available values from autocomplete list.
     * @param data {object} Object with instance data.
     * @param autocomplete_data Object with data, that was loaded from API for current field's autocomplete list.
     * @returns {{view_field: *, value_field: *}}
     */
    getAutocompleteValue(data = {}, autocomplete_data = {}) {
        return {
            value_field: autocomplete_data[this.getValueField(data)],
            view_field: autocomplete_data[this.getViewField(data)],
        };
    }

    /**
     * Method returns filter (name of field), that should be used during prefetch request -
     * request, that will be done during initial loading of field's (instance's) data.
     * @param data {object} Object with instance data.
     */
    getPrefetchFilterName(data = {}) {
        return this.getValueField(data);
    }

    /**
     * Method returns filter (name of field), that should be used during autocomplete request -
     * request that will be done during edit mode, when user selects one of the available values
     * from autocomplete list.
     * @param data {object} Object with instance data.
     */
    getAutocompleteFilterName(data = {}) {
        return this.getViewField(data);
    }
    /**
     * Redefinition of 'toInner' method of base guiField.
     * @param {object} data
     */
    toInner(data = {}) {
        let value = data[this.options.name];

        if (value && typeof value == 'object') {
            return value.value;
        }

        return value;
    }
    /**
     * Redefinition of 'toRepresent' method of base guiField.
     * @param {object} data
     */
    toRepresent(data = {}) {
        let value = data[this.options.name];

        if (value && typeof value == 'object') {
            return value.prefetch_value;
        }

        return value;
    }
    /**
     * Redefinition of '_insertTestValue' method of base guiField.
     */
    _insertTestValue(data = {}) {
        let val = data[this.options.name];
        let value;
        let format = this.options.format || this.options.type;
        let el = this._insertTestValue_getElement(format);

        if (val && val.prefetch_value && val.value) {
            value = val;
        } else {
            value = {
                value: value,
                prefetch_value: value,
            };
        }

        let newOption = new Option(value.prefetch_value, value.value, false, false);
        $(el).append(newOption);

        this._insertTestValue_imitateEvent(el);
    }
    /**
     * Redefinition of '_insertTestValue_getElement' method of base guiField.
     */
    _insertTestValue_getElement(format) {
        let selector = '.guifield-' + format + '-' + this.options.name + ' select';
        return $(selector)[0];
    }
    /**
     * Redefinition of '_insertTestValue_imitateEvent' method of base guiField.
     */
    _insertTestValue_imitateEvent(el) {
        el.dispatchEvent(new Event('change'));
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(FKFieldMixin);
    }

    /**
     * Static method, that prepares additionalProperties for usage.
     * This method, finds and sets querysets, needed for fk field work.
     * @param {object} field FK field instance.
     * @param {string} path Name of View path.
     */
    static prepareField(field, path) {
        let props = field.options.additionalProperties;

        if (!props) {
            return field;
        }

        if (props.querysets) {
            return field;
        }

        if (props.list_paths) {
            props.querysets = [];

            for (let index = 0; index < props.list_paths.length; index++) {
                props.querysets.push(this.getQuerySetByPath(props.list_paths[index]));
            }

            return field;
        }

        if (!props.model) {
            return field;
        }

        let constructor = new ViewConstructor(openapi_dictionary, app.models);
        let model = constructor.getViewSchema_model(props);

        if (!model) {
            return field;
        }

        props.querysets = [this.findQuerySet(path, model.name)];

        return field;
    }

    /**
     * Static method, that returns queryset of view by it's path.
     * @param {string} path Name of View path.
     */
    static getQuerySetByPath(path) {
        if (!app.views[path]) {
            return;
        }

        return app.views[path].objects.clone();
    }

    /**
     * Static method, that finds queryset by view's path and model's name.
     * @param {string} path Name of View path.
     * @param {string} model_name Name Model to which fk field links.
     */
    static findQuerySet(path, model_name) {
        let qs = this.findQuerySetInCurrentPath(path, model_name);

        if (qs) {
            return qs;
        }

        qs = this.findQuerySetInNeighbourPaths(path, model_name);

        if (qs) {
            return qs;
        }

        return this.findQuerySetSecondLevelPaths(model_name);
    }

    /**
     * Static method, that finds queryset by view's path and model's name in current path.
     * @param {string} path Name of View path.
     * @param {string} model_name Name Model to which fk field links.
     */
    static findQuerySetInCurrentPath(path, model_name) {
        if (app.views[path] && app.views[path].objects.model.name == model_name) {
            return app.views[path].objects.clone();
        }
    }

    /**
     * Static method, that finds queryset by view's path and model's name
     * in views with neighbour paths.
     * @param {string} path Name of View path.
     * @param {string} model_name Name Model to which fk field links.
     */
    static findQuerySetInNeighbourPaths(path, model_name) {
        let views = app.views;
        let num = path.replace(/^\/|\/$/g, '').split('/').length;
        // let level = views[path].schema.level + 2;
        let level = views[path].schema.level;
        let path1 = path.split('/').slice(0, -2).join('/') + '/';
        function func(item) {
            if (
                item.indexOf(path1) != -1 &&
                views[item].schema.type == 'list' &&
                views[item].schema.level <= level
            ) {
                return item;
            }
        }
        function func1(item) {
            if (views[item].objects.model.name == model_name) {
                return item;
            }
        }

        for (num; num > 0; num--) {
            path1 = path1.split('/').slice(0, -2).join('/') + '/';

            let paths = Object.keys(views)
                .filter(func)
                .sort((a, b) => {
                    return b.length - a.length;
                });

            let paths_with_model = paths.filter(func1);

            let closest_path = findClosestPath(paths_with_model, path);

            if (closest_path) {
                return views[closest_path].objects.clone();
            }
        }
    }
}

export default FKField;
