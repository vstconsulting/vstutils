import { BaseField } from '../../base';
import FKFieldMixin from './FKFieldMixin.js';
import { AggregatedQueriesExecutor } from '../../../AggregatedQueriesExecutor.js';
import {
    formatPath,
    getDependenceValueAsString,
    hasOwnProp,
    registerHook,
    RequestTypes,
} from '../../../utils';

const dependenceTemplateRegexp = /<<\w+>>/g;

function getPk(component) {
    if (typeof component.getInstancePk === 'function') {
        const pk = component.getInstancePk();
        if (pk !== undefined) {
            return pk;
        }
    }
    return component.params[component.view.parent?.pkParamName];
}

const dependenceTemplates = new Map([
    ['pk', getPk],
    ['view_name', (component) => component.view.name],
    ['parent_view_name', (component) => component.view.parent.name],
    ['view_level', (component) => component.view.level],
    ['operation_id', (component) => component.view.operation_id],
    ['parent_operation_id', (component) => component.view.parent.operation_id],
]);

const validAttrs = Array.from(dependenceTemplates.keys());

/**
 * Foreign key GUI field class for nested models.
 */
class FKField extends BaseField {
    constructor(options) {
        super(options);
        this.valueField = this.props.value_field;
        this.viewField = this.props.view_field;
        this.usePrefetch = this.props.usePrefetch;
        this.makeLink = this.props.makeLink;
        this.dependence = this.props.dependence || {};
        this.filters = this.props.filters || null;
        this.filterName = this.props.filter_name || this.valueField;
        this.filterFieldName = this.props.filter_field_name || this.valueField;

        if (hasOwnProp(this.props, 'fetchData')) {
            this.fetchData = this.props.fetchData;
        } else {
            this.fetchData = this.viewField !== this.valueField;
        }

        if (this.props.querysets instanceof Map) {
            this.querysets = this.props.querysets;
        } else {
            this.querysets = new Map(Object.entries(this.props.querysets || {}));
        }

        if (!this.fkModel && this.props.model) {
            registerHook('app.beforeInit', this.resolveModel.bind(this));
        }
    }

    resolveModel() {
        this.fkModel = this.constructor.app.modelsResolver.bySchemaObject(this.props.model);
    }

    static get mixins() {
        return [FKFieldMixin];
    }

    getEmptyValue() {
        return null;
    }

    toInner(data) {
        return this.getValueFieldValue(super.toInner(data));
    }

    isSameValues(data1, data2) {
        let val1 = this.toInner(data1);
        if (val1 && typeof val1 === 'object') {
            val1 = val1[this.valueField];
        }
        let val2 = this.toInner(data2);
        if (val2 && typeof val2 === 'object') {
            val2 = val2[this.valueField];
        }
        return val1 === val2;
    }

    prepareFieldForView(path) {
        if (this.querysets.has(path)) return;

        let querysets;
        const { list_paths } = this.props;

        if (list_paths) {
            querysets = list_paths.map((listPath) => app.views.get(listPath).objects.clone());
            if (!this.fkModel) {
                this.fkModel = querysets[0].getResponseModelClass(RequestTypes.LIST);
            }
        } else {
            querysets = [this.constructor.app.qsResolver.findQuerySet(this.fkModel.name, path)];
        }
        this.querysets.set(path, querysets);
    }

    _formatQuerysets(querysets) {
        return querysets.map((qs) => this._formatQuerysetPath(qs));
    }

    _formatQuerysetPath(queryset) {
        const params = this.constructor.app.application?.$route?.params || {};
        return queryset.clone({ url: formatPath(queryset.url, params) });
    }

    async afterInstancesFetched(instances) {
        if (this.usePrefetch && this.fetchData) {
            const path =
                this.constructor.app.application.$refs.currentViewComponent?.view?.path ||
                this.constructor.app.application.$route.name;
            return this.prefetchValues(instances, path);
        }
    }

    prefetchValues(instances, path) {
        const qs = this.getAppropriateQuerySet({ path });
        if (!qs) return;
        const executor = new AggregatedQueriesExecutor(qs, this.filterName, this.filterFieldName);
        const promises = [];
        for (const instance of instances) {
            const pk = this._getValueFromData(instance._data);
            if (pk) {
                promises.push(
                    executor
                        .query(pk)
                        .then((relatedInstance) => (instance._data[this.name] = relatedInstance)),
                );
            }
        }
        executor.execute();
        return Promise.allSettled(promises);
    }

    _resolveDependenceValue(key) {
        const foundTemplates = new Set(
            Array.from(key.matchAll(dependenceTemplateRegexp), (arr) => arr[0].slice(2, -2)).filter((el) =>
                validAttrs.includes(el),
            ),
        );
        if (foundTemplates.size === 0) {
            return;
        }

        for (const template of foundTemplates) {
            const handler = dependenceTemplates.get(template);
            try {
                key = template.replace(
                    template,
                    handler(this.constructor.app.application.$refs.currentViewComponent),
                );
            } catch (error) {
                console.warn(error.message);
                return;
            }
        }
        return key;
    }

    /**
     * Method that returns dependence filters. If null is returned it means that at least one of required
     * and non nullable fields is empty and field should be disabled.
     * @param {Object} data
     * @return {Object|null}
     */
    getDependenceFilters(data) {
        const filters = {};
        for (const [fieldName, filter] of Object.entries(this.dependence)) {
            let dependenceValue = this._resolveDependenceValue(fieldName);
            if (dependenceValue !== undefined) {
                filters[filter] = dependenceValue;
                continue;
            }
            const field = this.model.fields.get(fieldName);
            dependenceValue = getDependenceValueAsString(field.toInner(data));
            if (dependenceValue) {
                filters[filter] = dependenceValue;
            } else if (!field.nullable && field.required) {
                return null;
            }
        }
        return filters;
    }
    getValueFieldValue(val) {
        if (val !== null && typeof val === 'object') {
            if (val._data) {
                return val._data[this.valueField];
            } else {
                return val.value;
            }
        }
        return val;
    }

    getViewFieldValue(val) {
        if (val !== null && typeof val === 'object') {
            return val[this.viewField];
        }
        return val;
    }

    /**
     * Method, that selects one, the most appropriate queryset, from querysets array.
     * @param {object} data Object with instance data.
     * @param {array=} querysets Array with field QuerySets.
     * @param {string} path
     * @return {QuerySet|undefined}
     */
    // eslint-disable-next-line no-unused-vars
    getAppropriateQuerySet({ data, querysets, path } = {}) {
        const [qs] = querysets || this.querysets.get(path) || [];
        if (qs) {
            return this._formatQuerysetPath(qs);
        }
    }

    getFirstLevelQs() {
        for (const querysets of this.querysets.values()) {
            for (const queryset of querysets) {
                if (queryset.getDataType().length === 1) {
                    return queryset;
                }
            }
        }
    }

    getAllQuerysets(path) {
        return this._formatQuerysets(
            this.querysets.get(path) || this.querysets.get(undefined) || [this.getFirstLevelQs()],
        );
    }
}

export default FKField;
