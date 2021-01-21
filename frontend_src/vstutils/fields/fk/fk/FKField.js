import $ from 'jquery';
import { BaseField } from '../../base';
import FKFieldMixin from './FKFieldMixin.js';
import { AggregatedQueriesExecutor } from '../../../AggregatedQueriesExecutor.js';
import { formatPath, getDependenceValueAsString, RequestTypes } from '../../../utils';

/**
 * FK guiField class.
 */
class FKField extends BaseField {
    constructor(options) {
        super(options);
        const props = options.additionalProperties;

        this.fkModelSchema = props.model;
        this.valueField = props.value_field;
        this.viewField = props.view_field;
        this.usePrefetch = props.usePrefetch;
        this.makeLink = props.makeLink;
        this.dependence = props.dependence || {};

        this.fetchData = Object.prototype.hasOwnProperty.call(props, 'fetchData') ? props.fetchData : true;

        /**
         * Property will be set in prepareField.
         * @type {QuerySet[]}
         */
        this.querysets = props.querysets;

        /**
         * Property will be set in prepareField.
         * @type {Function<Model>}
         */
        this.fkModel = null;
    }

    static get mixins() {
        return [FKFieldMixin];
    }

    static prepareFieldClass(app) {
        this.appInstance = app;
    }

    getInitialValue() {
        return null;
    }

    toInner(data) {
        return this.getValueFieldValue(super.toInner(data));
    }

    prepareField(app, path) {
        const { list_paths } = this.options.additionalProperties;

        if (this.fkModelSchema) {
            this.fkModel = app.modelsResolver.bySchemaObject(this.fkModelSchema);
        }

        if (this.querysets) return;

        let querysets;

        if (list_paths) {
            querysets = list_paths.map((listPath) => app.views.get(listPath).objects.clone());
            if (!this.fkModel) {
                this.fkModel = querysets[0].getModelClass(RequestTypes.LIST);
            }
        } else {
            querysets = [app.qsResolver.findQuerySet(this.fkModel.name, path)];
        }
        this.querysets = this._formatQuerysets(querysets);
    }

    _formatQuerysets(querysets) {
        return querysets.map((qs) => this._formatQuerysetPath(qs));
    }

    _formatQuerysetPath(queryset) {
        const params = this.constructor.appInstance.application?.$route?.params || {};
        return queryset.clone({ url: formatPath(queryset.url, params) });
    }

    async afterInstancesFetched(instances) {
        if (this.usePrefetch) {
            return this.prefetchValues(instances);
        }
    }

    prefetchValues(instances) {
        const executor = new AggregatedQueriesExecutor(this.getAppropriateQuerySet(), this.valueField);
        for (const instance of instances) {
            const pk = instance._data[this.name];
            if (pk) {
                executor.query(pk).then((relatedInstance) => (instance._data[this.name] = relatedInstance));
            }
        }
        return executor.execute();
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
            const field = this.model.fields.get(fieldName);
            const dependenceValue = getDependenceValueAsString(field.toInner(data));
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
     * @param data {object} Object with instance data.
     * @param querysets {array=} Array with field QuerySets.
     */
    getAppropriateQuerySet(data, querysets = undefined) {
        return this._formatQuerysetPath((querysets || this.querysets)[0]);
    }

    getAllQuerysets() {
        return this._formatQuerysets(this.querysets);
    }

    /**
     * Redefinition of '_insertTestValue' method of base guiField.
     */
    _insertTestValue(data = {}) {
        let val = data[this.options.name];
        let value = undefined;
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
}

export default FKField;
