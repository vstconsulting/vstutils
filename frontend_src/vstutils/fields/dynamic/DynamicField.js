import $ from 'jquery';
import { BaseField } from '../base';
import DynamicFieldMixin from './DynamicFieldMixin.vue';

/**
 * Dynamic guiField class.
 */
class DynamicField extends BaseField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(DynamicFieldMixin);
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
    /**
     * Redefinition of 'validateValue' method of base guiField.
     * @param {object} data
     */
    validateValue(data = {}) {
        return this.getRealField(data).validateValue(data);
    }
    /**
     * Redefinition of base guiField method _insertTestValue.
     */
    _insertTestValue(data = {}) {
        let real_field = this.getRealField(data);
        /**
         * Timeout is needed for adding some async,
         * because without it adding of test values is too quick
         * and vue component of dynamic field cleans inserted value.
         */
        setTimeout(() => {
            real_field._insertTestValue(data);
        }, 20);
    }
    /**
     * Method, that returns Array with names of parent fields -
     * fields, from which values, current field's format depends on.
     * @private
     * @return {array}
     */
    _getParentFields() {
        let p_f = this.options.additionalProperties.field || [];

        if (Array.isArray(p_f)) {
            return p_f;
        }

        return [p_f];
    }
    /**
     * Method, that returns Object, that stores pairs (key, value):
     *  - key - name of parent field;
     *  - value - new format of current field.
     * @private
     * @return {object}
     */
    _getParentTypes() {
        return this.options.additionalProperties.types || {};
    }
    /**
     * Method, that returns Object, that stores arrays with choices values.
     * @private
     * @return {object}
     */
    _getParentChoices() {
        return this.options.additionalProperties.choices || {};
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
        let parent_values = this._getParentValues(data);
        let parent_types = this._getParentTypes();
        let parent_choices = this._getParentChoices();
        let opt = {
            format: undefined,
        };

        for (let key in parent_values) {
            if (parent_values.hasOwnProperty(key)) {
                let item = parent_types[parent_values[key]];
                if (item !== undefined) {
                    opt.format = item;
                }
            }
        }

        for (let key in parent_values) {
            if (parent_values.hasOwnProperty(key)) {
                let item = parent_choices[parent_values[key]];
                if (item !== undefined && Array.isArray(item)) {
                    let bool_values = item.some((val) => {
                        if (typeof val == 'boolean') {
                            return val;
                        }
                    });

                    if (bool_values) {
                        opt.format = 'boolean';
                    } else {
                        opt.enum = item;
                        opt.format = 'choices';
                    }
                }
            }
        }

        for (let key in this.options) {
            if (this.options.hasOwnProperty(key)) {
                if (['format', 'additionalProperties'].includes(key)) {
                    continue;
                }

                opt[key] = this.options[key];
            }
        }

        let callback_opt = {};

        if (this.options.additionalProperties.callback) {
            callback_opt = this.options.additionalProperties.callback(parent_values);
        }

        opt = $.extend(true, opt, callback_opt);

        if (!window.guiFields[opt.format]) {
            opt.format = 'string';
        }

        let real_field = new window.guiFields[opt.format](opt);

        if (real_field.constructor.prepareField) {
            real_field = real_field.constructor.prepareField(real_field, app.application.$route.name);
        }

        return real_field;
    }
}

export default DynamicField;
