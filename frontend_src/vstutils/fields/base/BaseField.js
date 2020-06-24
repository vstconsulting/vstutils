import $ from 'jquery';
import { _translate } from '../../utils';
import { pop_up_msg } from '../../popUp';
import BaseFieldMixin from './BaseFieldMixin.vue';

/**
 * Base guiField class.
 */
class BaseField {
    /**
     * Constructor of base guiField class.
     * @param {object} options Object with field options.
     */
    constructor(options = {}) {
        /**
         * Options - object with field options.
         */
        this.options = options;
        /**
         * Mixins - array of mixin objects - properties for Vue component, that extend it.
         */
        this.mixins = this.constructor.mixins;
    }
    /**
     * Method, that converts field value from form in appropriate way for API.
     * @param {object} data Object with values of current field
     * and fields from the same fields wrapper.
     * For example, from the same Model Instance.
     */
    toInner(data = {}) {
        return data[this.options.name];
    }
    /**
     * Method, that converts field value from API in appropriate way for form
     * @param {object} data Object with values of current field
     * and fields from the same fields wrapper.
     * For example, from the same Model Instance.
     */
    toRepresent(data = {}) {
        return data[this.options.name];
    }
    /**
     * Method, that validates values.
     * Method checks that value satisfies field's options.
     * @param {object} data Object with values of current field
     * and fields from the same fields wrapper.
     * For example, from the same Model Instance.
     */
    validateValue(data = {}) {
        let value = data[this.options.name];
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
                message: $t(samples.maxLength).format([$t(title), this.options.maxLength]),
            };
        }

        if (this.options.minLength) {
            if (value_length === 0) {
                if (!this.options.required) {
                    return;
                }

                throw {
                    error: 'validation',
                    message: $t(samples.empty).format([$t(title)]),
                };
            }

            if (value_length < this.options.minLength) {
                throw {
                    error: 'validation',
                    message: $t(samples.minLength).format([$t(title), this.options.minLength]),
                };
            }
        }

        if (this.options.max && value > this.options.max) {
            throw {
                error: 'validation',
                message: $t(samples.max).format([$t(title), this.options.max]),
            };
        }

        if (this.options.min && value < this.options.min) {
            throw {
                error: 'validation',
                message: $t(samples.min).format([$t(title), this.options.min]),
            };
        }

        if (value === undefined && this.options.required && this.options.default !== undefined) {
            return this.options.default;
        }

        if (value === undefined && this.options.required && !this.options.default) {
            throw {
                error: 'validation',
                message: $t(samples.required).format([$t(title)]),
            };
        }

        if (this.validateValueCustom && typeof this.validateValueCustom == 'function') {
            return this.validateValueCustom(data);
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
}

export default BaseField;
