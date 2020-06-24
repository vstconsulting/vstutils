import { BaseField } from '../base';
import { BaseEntityConstructor } from '../../models';
import { openapi_dictionary } from '../../api';
import FormFieldMixin from './FormFieldMixin.vue';

/**
 * Form guiField class.
 */
class FormField extends BaseField {
    /**
     * Redefinition of base guiField constructor.
     */
    constructor(options = {}) {
        super(options);
    }
    /**
     * Method, that makes some manipulations with value.
     * @param {object} data Field value.
     * @param {string} method Method, that will called.
     * @private
     */
    _getValue(data, method) {
        let val = {};

        let realFields = this.generateRealFields();

        for (let key in realFields) {
            if (Object.prototype.hasOwnProperty.call(realFields, key)) {
                let real_value = realFields[key][method](data[this.options.name]);

                if (real_value !== undefined) {
                    val[key] = real_value;
                }
            }
        }

        return val;
    }
    /**
     * Redefinition of base guiField 'toInner' method.
     * @param {object} data
     */
    toInner(data = {}) {
        return this._getValue(data, 'toInner');
    }
    /**
     * Redefinition of base guiField 'toRepresent' method.
     * @param {object} data
     */
    toRepresent(data = {}) {
        return this._getValue(data, 'toInner');
    }
    /**
     * Redefinition of base guiField 'validateValue' method.
     * @param {object} data
     */
    validateValue(data = {}) {
        return this._getValue(data, 'validateValue');
    }
    /**
     * Method, that inits all real field of form.
     */
    generateRealFields() {
        let realFields = {};

        if (this.options.form) {
            let constructor = new BaseEntityConstructor(openapi_dictionary);

            for (let key in this.options.form) {
                if (Object.prototype.hasOwnProperty.call(this.options.form, key)) {
                    let field = this.options.form[key];
                    field.name = key;

                    field.format = constructor.getFieldFormat(field);

                    realFields[key] = this.generateRealField(field);
                }
            }
        }

        return realFields;
    }
    /**
     * Method, that inits real field of form.
     * @param {object} options Options of real field.
     */
    generateRealField(options) {
        let field = new window.spa.fields.guiFields[options.format](options);

        if (field.constructor.prepareField) {
            field = field.constructor.prepareField(field, window.app.application.$route.name);
        }

        return field;
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(FormFieldMixin);
    }
}

export default FormField;
