import { BaseField } from '../base';
import FormFieldMixin from './FormFieldMixin.vue';
import { getFieldFormat } from '../index.js';

/**
 * Form guiField class.
 */
class FormField extends BaseField {
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
            for (let key in this.options.form) {
                if (Object.prototype.hasOwnProperty.call(this.options.form, key)) {
                    let field = this.options.form[key];
                    field.name = key;

                    field.format = getFieldFormat(field);

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
        const Field = this.constructor.app.fieldsClasses.get(options.format);
        const field = new Field(options);

        // TODO cannot prepare field because have no app and path
        // field.prepareFieldForView(path);

        return field;
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return [FormFieldMixin];
    }
}

export default FormField;
