import { BaseField } from '../base';
import DynamicFieldMixin from './DynamicFieldMixin.vue';
import { mapObjectValues, registerHook } from '../../utils';

/**
 * Dynamic guiField class.
 */
class DynamicField extends BaseField {
    constructor(options) {
        super(options);
        this.usedOnViews = [];
        registerHook('app.beforeInit', this.resolveTypes.bind(this));
    }

    resolveTypes() {
        /** @type {Object<string, BaseField>} */
        this.types = this.props.types
            ? mapObjectValues(this.props.types, (field) => {
                  const fieldInstance = this.constructor.app.fieldsResolver.resolveField(field, this.name);
                  if (!field.title) {
                      fieldInstance.title = this.title;
                  }
                  return fieldInstance;
              })
            : null;
        if (this.types)
            for (const path of this.usedOnViews)
                for (const field of Object.values(this.types)) field.prepareFieldForView(path);
    }

    prepareFieldForView(path) {
        this.usedOnViews.push(path);
    }

    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return [DynamicFieldMixin];
    }
    /**
     * Redefinition of 'toInner' method of base guiField.
     * @param {object} data
     */
    toInner(data = {}) {
        return this.getRealField(data).toInner(data);
    }
    /**
     * Redefinition of 'toRepresent' method of base guiField.
     * @param {object} data
     */
    toRepresent(data = {}) {
        return this.getRealField(data).toRepresent(data);
    }
    validateValue(data) {
        return this.getRealField(data).validateValue(data);
    }
    afterInstancesFetched(instances, queryset) {
        /** @type {Map<BaseField, Model[]>} */
        const fields = new Map();

        for (const instance of instances) {
            const realField = this.getRealField(instance._data);
            const sameField = Array.from(fields.keys()).find((field) => realField.isEqual(field));

            if (sameField) {
                fields.get(sameField).push(instance);
            } else {
                fields.set(realField, [instance]);
            }
        }

        return Promise.all(
            Array.from(fields.entries()).map(([field, instances]) =>
                field.afterInstancesFetched(instances, queryset),
            ),
        );
    }
    /**
     * Method, that returns Array with names of parent fields -
     * fields, from which values, current field's format depends on.
     * @private
     * @return {array}
     */
    _getParentFields() {
        let p_f = this.props.field || [];

        if (Array.isArray(p_f)) {
            return p_f;
        }

        return [p_f];
    }
    /**
     * Method, that returns Object, that stores arrays with choices values.
     * @private
     * @return {object}
     */
    _getParentChoices() {
        return this.props.choices || {};
    }
    /**
     * Method, that returns values of parent fields.
     * @param {object} data Object with values of current field
     * and fields from the same fields wrapper.
     * @private
     */
    _getParentValues(data = {}) {
        let parent_fields = this._getParentFields();

        let parent_values = {};

        parent_fields.forEach((item) => {
            parent_values[item] = data[item];
        });

        return parent_values;
    }
    /**
     * Method, that returns real field instance - some guiField instance of format,
     * that current field should have in current moment.
     * @param {object} data Object with values of current field
     * and fields from the same fields wrapper.
     * For example, from the same Model Instance.
     */
    getRealField(data = {}) {
        const parentValues = this._getParentValues(data);

        const field =
            this._getFromTypes(parentValues) ||
            this._getFromCallback(parentValues) ||
            this._getFromChoices(parentValues) ||
            this._getDefault();

        field.prepareFieldForView(this.constructor.app.getCurrentViewPath());

        return field;
    }

    parseFieldError(data, instanceData = {}) {
        return this.getRealField(instanceData).parseFieldError(data, instanceData);
    }

    _getFromTypes(parentValues) {
        if (this.types) {
            for (const key of Object.values(parentValues)) {
                const field = this.types[key];
                if (field) return field;
            }
        }
    }

    _getFromChoices(parentValues) {
        const parentChoices = this._getParentChoices();
        for (const key in parentValues) {
            if (Object.prototype.hasOwnProperty.call(parentValues, key)) {
                const item = parentChoices[parentValues[key]];
                if (Array.isArray(item)) {
                    const isBoolean = item.some((val) => typeof val === 'boolean');
                    return this.constructor.app.fieldsResolver.resolveField(
                        isBoolean ? 'boolean' : { format: 'choices', enum: item },
                        this.name,
                    );
                }
            }
        }
    }

    _getFromCallback(parentValues) {
        if (this.props.callback) {
            const callbackResult = this.props.callback(parentValues);
            if (callbackResult instanceof BaseField) {
                return callbackResult;
            } else if (typeof callbackResult === 'object') {
                return this.constructor.app.fieldsResolver.resolveField(callbackResult, this.name);
            }
        }
    }

    _getDefault() {
        return this.constructor.app.fieldsResolver.resolveField('string', this.name);
    }
}

export default DynamicField;
