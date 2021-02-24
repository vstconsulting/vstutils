import $ from 'jquery';
import { _translate, capitalize } from '../../utils';
import { pop_up_msg } from '../../popUp';
import BaseFieldMixin from './BaseFieldMixin.vue';

/**
 * @template TInner, TRepresent
 */
class BaseField {
    /**
     * Constructor of base field class.
     * @param {Object} options - Object with field options.
     */
    constructor(options) {
        /**
         * Options - object with field options.
         * @type {Object}
         */
        this.options = options;

        /** @type {string} */
        this.format = options.format;

        /** @type {FieldValidator[]} */
        this.validators = [];

        // Model will be set on model class creation
        this.model = null;

        /** @type {Boolean} */
        this.hidden = options.hidden;

        /** @type {string} */
        this.name = options.name;

        /** @type {string} */
        this.title = options.title || capitalize(this.name.replace(/_/g, ' '));

        /** @type {string|null} */
        this.description = options.description || null;

        /** @type {boolean} */
        this.required = Boolean(options.required);

        /** @type {boolean} */
        this.readOnly = Boolean(options.readOnly);

        /** @type {boolean} */
        this.nullable = options['x-nullable'];

        /** @type {boolean} */
        this.hasDefault = Object.prototype.hasOwnProperty.call(options, 'default');
        if (this.hasDefault)
            /** @type {TInner} */
            this.default = options.default;

        this.component = {
            name: `${this.constructor.name || capitalize(this.name)}FieldComponent`,
            mixins: this.constructor.mixins,
        };
    }

    /**
     * Method, that prepares instance of field for usage. Method is called after models and views are
     * created, for every field instance that is part of view.
     * @param {App} app
     * @param {string} path
     */
    // eslint-disable-next-line no-unused-vars
    prepareField(app, path) {}

    /**
     * Method that will be called after every fetch of instances from api (QuerySet#items, QuerySet#get)
     * @param {Model[]} instances
     * @param {QuerySet} queryset
     */
    // eslint-disable-next-line no-unused-vars
    async afterInstancesFetched(instances, queryset) {}

    /**
     * @return {TInner}
     */
    getInitialValue() {
        return this.hasDefault ? this.default : '';
    }

    /**
     * Method, that converts field value to appropriate for API form.
     * @param {Object} data
     * @return {TInner}
     */
    toInner(data) {
        return data[this.options.name];
    }

    /**
     * Method, that converts field value from API to display form
     * @param {InnerData} data - Object with values of current field
     * @return {TRepresent}
     */
    toRepresent(data) {
        return data[this.options.name];
    }

    /**
     * Method that validates value.
     * @param {*} value - Value to validate.
     * @param {RepresentData} data - Object with all values.
     */
    validateValue(value, data) {
        let value_length = 0;
        let samples = pop_up_msg.field.error;
        let title = (this.options.title || this.options.name).toLowerCase();
        let $t = _translate;

        if (value) {
            value_length = value.toString().length;
        }

        if (this.options.maxLength && value_length > this.options.maxLength) {
            throw {
                error: 'validation',
                message: $t(samples.maxLength).format([this.options.maxLength]),
            };
        }

        if (this.options.minLength) {
            if (value_length === 0) {
                if (!this.options.required) {
                    return;
                }

                throw {
                    error: 'validation',
                    message: $t(samples.empty),
                };
            }

            if (value_length < this.options.minLength) {
                throw {
                    error: 'validation',
                    message: $t(samples.minLength).format([this.options.minLength]),
                };
            }
        }

        if (this.options.max && value > this.options.max) {
            throw {
                error: 'validation',
                message: $t(samples.max).format([this.options.max]),
            };
        }

        if (this.options.min && value < this.options.min) {
            throw {
                error: 'validation',
                message: $t(samples.min).format([this.options.min]),
            };
        }

        if (value === undefined && this.options.required && this.options.default !== undefined) {
            return this.options.default;
        }

        if (value === undefined && this.options.required && !this.options.default) {
            throw {
                error: 'validation',
                message: $t(samples.required),
            };
        }

        if (this.validateValueCustom && typeof this.validateValueCustom == 'function') {
            return this.validateValueCustom(value);
        }

        return value;
    }
    /**
     * Method, that is used during gui tests - this method imitates user's value input.
     * @param {object} data Object with values of current field
     * and fields from the same fields wrapper.
     * For example, from the same Model Instance.
     * @private
     */
    _insertTestValue(data = {}) {
        let value = data[this.options.name];
        let format = this.options.format || this.options.type;
        let el = this._insertTestValue_getElement(format);

        $(el).val(value);

        this._insertTestValue_imitateEvent(el);
    }
    /**
     * Method, that returns DOM element of input part of guiField.
     * This method is supposed to be called from _insertTestValue method.
     * @param {string} format Field's format.
     * @private
     */
    _insertTestValue_getElement(format) {
        let selector = '.guifield-' + format + '-' + this.options.name + ' input';
        return $(selector)[0];
    }
    /**
     * Method, that imitates event of inserting value into field.
     * This method is supposed to be called from _insertTestValue method.
     * @param {object} el DOM element of field's input.
     * @private
     */
    _insertTestValue_imitateEvent(el) {
        el.dispatchEvent(new Event('input'));
    }
    /**
     * Static property for storing field mixins.
     */
    static get mixins() {
        return [BaseFieldMixin];
    }

    /**
     * Method that creates property descriptor from current field
     * @return {PropertyDescriptor}
     */
    toDescriptor() {
        const fieldThis = this;
        return {
            get() {
                return fieldThis.toRepresent(this._data);
            },
            set(value) {
                fieldThis.validateValue(value, this._data);
                this._data[fieldThis.name] = fieldThis.toInner({ ...this._data, [fieldThis.name]: value });
            },
        };
    }
}

export default BaseField;
