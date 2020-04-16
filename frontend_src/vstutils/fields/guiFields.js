import $ from 'jquery';
import moment from 'moment';
import { gui_fields_mixins } from './guiFieldsMixins.js';
import { _translate, findClosestPath, BaseEntityConstructor } from '../utils';
import { pop_up_msg } from '../popUp';
import { ViewConstructor } from '../views';
import { openapi_dictionary } from '../api';

/**
 * Object, that contains guiFields classes.
 */
let guiFields = {};

/**
 * Base guiField class.
 */
guiFields.base = class BaseField {
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
            if (value_length == 0) {
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
        return [gui_fields_mixins.base];
    }
};

/**
 * String guiField class.
 */
guiFields.string = class StringField extends guiFields.base {};

/**
 * Textarea guiField class.
 */
guiFields.textarea = class TextAreaField extends guiFields.base {
    /**
     * Redefinition of base guiField method '_insertTestValue_getElement'.
     */
    _insertTestValue_getElement(format) {
        let selector = '.guifield-' + format + '-' + this.options.name + ' textarea';
        return $(selector)[0];
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.textarea);
    }
};

/**
 * Integer guiField class.
 */
guiFields.integer = class IntegerField extends guiFields.base {
    /**
     * Redefinition of base guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        let value = data[this.options.name];

        if (value === undefined) {
            return;
        }

        let val = Number(value);

        if (isNaN(val)) {
            console.error('Error in integer.toInner()');
            return;
        }

        return val;
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.integer);
    }
};

/**
 * Int32 guiField class.
 */
guiFields.int32 = class Int32Field extends guiFields.integer {};

/**
 * Int64 guiField class.
 */
guiFields.int64 = class Int64Field extends guiFields.integer {};

/**
 * Double guiField class.
 */
guiFields.double = class DoubleField extends guiFields.integer {};

/**
 * Number guiField class.
 */
guiFields.number = class NumberField extends guiFields.integer {};

/**
 * Float guiField class.
 */
guiFields.float = class FloatField extends guiFields.integer {};

/**
 * Boolean guiField class.
 */
guiFields.boolean = class BooleanField extends guiFields.base {
    /**
     * Custom method for toInner and toRepresent methods.
     * @param {object} data
     */
    _getValue(data = {}) {
        let value = data[this.options.name];

        if (typeof value == 'boolean') {
            return value;
        }

        if (typeof value == 'string') {
            return stringToBoolean(value); /* globals stringToBoolean */
        }

        if (typeof value == 'number') {
            return Boolean(value);
        }
    }

    /**
     * Redefinition of base guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        return this._getValue(data);
    }
    /**
     * Redefinition of base guiField method toRepresent.
     * @param {object} data
     */
    toRepresent(data = {}) {
        return this._getValue(data);
    }
    /**
     * Redefinition of base guiField method _insertTestValue.
     */
    _insertTestValue(data) {
        let value = data[this.options.name];
        let format = this.options.format || this.options.type;
        let el = this._insertTestValue_getElement(format);

        this._insertTestValue_imitateEvent(el);

        if ($(el).hasClass('selected') == value) {
            this._insertTestValue_imitateEvent(el);
        }
    }
    /**
     * Redefinition of base guiField method '_insertTestValue_getElement'.
     */
    _insertTestValue_getElement(format) {
        let selector = '.guifield-' + format + '-' + this.options.name + ' .boolean-select';
        return $(selector)[0];
    }
    /**
     * Redefinition of base guiField method _insertTestValue_imitateEvent.
     */
    _insertTestValue_imitateEvent(el) {
        $(el).trigger('click');
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.boolean);
    }
};

/**
 * Choices guiField class.
 */
guiFields.choices = class ChoicesField extends guiFields.string {
    /**
     * Custom method for toInner and toRepresent methods.
     * @param {object} data
     */
    _getValue(data = {}) {
        let value = data[this.options.name];

        if (!value) {
            return;
        }

        if (this.options.enum && this.options.enum.includes(value)) {
            return value;
        }

        console.error('There is no appropriate choice in enum list');
    }
    /**
     * Redefinition of string guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        return this._getValue(data);
    }
    /**
     * Redefinition of string guiField method toRepresent.
     * @param {object} data
     */
    toRepresent(data = {}) {
        return this._getValue(data);
    }
    /**
     * Redefinition of base guiField method '_insertTestValue_getElement'.
     */
    _insertTestValue_getElement(format) {
        let selector = '.guifield-' + format + '-' + this.options.name + ' select';
        return $(selector)[0];
    }
    /**
     * Redefinition _insertTestValue_imitateEvent
     */
    _insertTestValue_imitateEvent(el) {
        el.dispatchEvent(new Event('change'));
    }
    /**
     * Redefinition of string guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.choices);
    }
};

/**
 * Autocomplete guiField class.
 */
guiFields.autocomplete = class AutocompleteField extends guiFields.string {
    /**
     * Redefinition of base guiField method _insertTestValue_imitateEvent.
     */
    _insertTestValue_imitateEvent(el) {
        el.dispatchEvent(new Event('blur'));
    }
    /**
     * Redefinition of string guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.autocomplete);
    }
};

/**
 * Password guiField class.
 */
guiFields.password = class PasswordField extends guiFields.string {
    /**
     * Redefinition of string guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.password);
    }
};

/**
 * Email guiField class.
 */
guiFields.email = class EmailField extends guiFields.string {
    /**
     * Redefinition of string guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.email);
    }

    /**
     * Static property, that returns regExp for email string validation.
     * @return {RegExp}
     */
    static get validation_reg_exp() {
        return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    }

    /**
     * Redefinition of 'validateValue' method of string guiField.
     */
    validateValue(data = {}) {
        let value = super.validateValue(data);

        if (this.options.required && !this.constructor.validation_reg_exp.test(String(value))) {
            let title = (this.options.title || this.options.name).toLowerCase();
            let $t = _translate;

            let err_msg = '<b>"{0}"</b> field should be written in <b>"example@mail.com"</b> format.';

            throw {
                error: 'validation',
                message: $t(err_msg).format([$t(title)]),
            };
        }

        return value;
    }
};

/**
 * File guiField class.
 */
guiFields.file = class FileField extends guiFields.textarea {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.file);
    }
};

/**
 * Secretfile guiField class.
 */
guiFields.secretfile = class SecretFileField extends guiFields.file {};

/**
 * BinFile guiField class.
 * Field takes file's content, converts it into base64 string and sends this string to API.
 */
guiFields.binfile = class BinFileField extends guiFields.file {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.binfile);
    }

    /**
     * Method, that converts field's value to base64.
     * It's supposed that value of current field is an instance of ArrayBuffer.
     * @param {object} data Object with values of current field
     * and fields from the same fields wrapper.
     * For example, from the same Model Instance.
     */
    toBase64(data = {}) {
        let value = data[this.options.name];

        if (value !== undefined) {
            return arrayBufferToBase64(value); /* globals arrayBufferToBase64 */
        }
    }
};

/**
 * NamedBinFile guiField class.
 * This field takes and returns JSON with 2 properties:
 * - name - string - name of file;
 * - content - base64 string - content of file.
 */
guiFields.namedbinfile = class NamedBinFileField extends guiFields.binfile {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.namedbinfile);
    }
    /**
     * Redefinition of 'validateValue' method of binfile guiField.
     */
    validateValue(data = {}) {
        let value = super.validateValue(data);

        if (value && this.options.required && value.name === null && value.content === null) {
            let title = (this.options.title || this.options.name).toLowerCase();
            let $t = _translate;

            throw {
                error: 'validation',
                message: $t(pop_up_msg.field.error.empty).format($t(title)),
            };
        }

        return value;
    }
};

/**
 * NamedBinImage guiField class.
 * This field takes and returns JSON with 2 properties:
 * - name - string - name of image;
 * - content - base64 string - content of image.
 */
guiFields.namedbinimage = class NamedBinImageField extends guiFields.namedbinfile {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.namedbinimage);
    }
};

/**
 * MultipleNamedBinFile guiField class.
 * This field takes and returns array with objects, consisting of 2 properties:
 * - name - string - name of file;
 * - content - base64 string - content of file.
 */
guiFields.multiplenamedbinfile = class MultipleNamedBinFileField extends guiFields.namedbinfile {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.multiplenamedbinfile);
    }
    /**
     * Redefinition of 'validateValue' method of binfile guiField.
     */
    validateValue(data = {}) {
        let value = super.validateValue(data);

        if (value && this.options.required && Array.isArray(value) && value.length === 0) {
            let title = (this.options.title || this.options.name).toLowerCase();
            let $t = _translate;

            throw {
                error: 'validation',
                message: $t(pop_up_msg.field.error.empty).format($t(title)),
            };
        }

        return value;
    }
};

/**
 * MultipleNamedBinImage guiField class.
 * This field takes and returns array with objects, consisting of 2 properties:
 * - name - string - name of file;
 * - content - base64 string - content of file.
 */
guiFields.multiplenamedbinimage = class MultipleNamedBinImageField extends guiFields.multiplenamedbinfile {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.multiplenamedbinimage);
    }
};

/**
 * Text paragraph guiField class.
 */
guiFields.text_paragraph = class TextParagraphField extends guiFields.base {
    /**
     * Redefinition of 'toRepresent' method of base guiField.
     */
    toRepresent(data = {}) {
        let value = data[this.options.name];

        if (value === undefined) {
            return this.options.default;
        }

        if (typeof value == 'object') {
            if (Array.isArray(value)) {
                return value.join(' ');
            }

            return JSON.stringify(value);
        }

        return value;
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.text_paragraph);
    }
};

/**
 * Plain text guiField class.
 * This field represents text data, saving all invisible symbols (spaces, tabs, new line symbol).
 */
guiFields.plain_text = class PlainTextField extends guiFields.textarea {
    /**
     * Redefinition of textarea guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.plain_text);
    }
};

/**
 * Html guiField class.
 */
guiFields.html = class HtmlField extends guiFields.plain_text {
    /**
     * Redefinition of plain_text guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.html);
    }
};

/**
 * Date guiField class.
 */
guiFields.date = class DateField extends guiFields.base {
    /**
     * Custom method for toInner and toRepresent methods.
     * @param {object} data
     */
    _getValue(data = {}) {
        let value = data[this.options.name];

        if (!value) {
            return;
        }

        return moment(value).format('YYYY-MM-DD');
    }
    /**
     * Redefinition of base guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        return this._getValue(data);
    }
    /**
     * Redefinition of base guiField method toRepresent.
     * @param {object} data
     */
    toRepresent(data = {}) {
        return this._getValue(data);
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.date);
    }
};

/**
 * Date_time guiField class.
 */
guiFields.date_time = class DateTimeField extends guiFields.base {
    /**
     * Redefinition of base guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        let value = data[this.options.name];

        if (!value) {
            return;
        }

        return moment(value).tz(app.api.getTimeZone()).format();
    }
    /**
     * Redefinition of base guiField method toRepresent.
     * @param {object} data
     */
    toRepresent(data = {}) {
        let value = data[this.options.name];

        if (!value) {
            return;
        }

        let m = moment(moment.tz(value, app.api.getTimeZone())).tz(moment.tz.guess());

        return m.format('YYYY-MM-DD') + 'T' + m.format('HH:mm');
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.date_time);
    }
};

/**
 * Uptime guiField class.
 * Field that gets time in seconds as value and shows it in convenient way for user.
 * Due to size of time field selects one of the most appropriate pattern from these templates:
 * - 23:59:59
 * - 01d 00:00:00
 * - 01m 30d 00:00:00
 * - 99y 11m 30d 22:23:24
 */
guiFields.uptime = class UptimeField extends guiFields.base {
    constructor(options = {}) {
        super(options);
        /**
         * Array of regexps for current field.
         * These regexps are needed for converting value from seconds to uptime format.
         */
        this.reg_exp_arr = [
            /(?<y>[0-9]+)[y] (?<m>[0-9]+)[m] (?<d>[0-9]+)[d] (?<hh>[0-9]+):(?<mm>[0-9]+):(?<ss>[0-9]+)/,
            /(?<m>[0-9]+)[m] (?<d>[0-9]+)[d] (?<hh>[0-9]+):(?<mm>[0-9]+):(?<ss>[0-9]+)/,
            /(?<d>[0-9]+)[d] (?<hh>[0-9]+):(?<mm>[0-9]+):(?<ss>[0-9]+)/,
            /(?<hh>[0-9]+):(?<mm>[0-9]+):(?<ss>[0-9]+)/,
        ];
    }
    /**
     * Redefinition of base guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        let value = data[this.options.name];

        if (!value) {
            return;
        }

        //@todo think about this 'if', during making decision about what type of data to save in store
        // toInner or to Represent.
        if (!isNaN(Number(value))) {
            return Number(value);
        }

        let uptime_in_seconds = 0;

        for (const regexp of this.reg_exp_arr) {
            const match = regexp.exec(value);
            if (!match) {
                continue;
            }

            const time_parts = match.groups();

            let duration_obj = {
                seconds: Number(time_parts.ss),
                minutes: Number(time_parts.mm),
                hours: Number(time_parts.hh),
                days: Number(time_parts.d || 0),
                months: Number(time_parts.m || 0),
                years: Number(time_parts.y || 0),
            };

            uptime_in_seconds = moment.duration(duration_obj).asSeconds();

            return uptime_in_seconds;
        }

        return uptime_in_seconds;
    }
    /**
     * Redefinition of base guiField method toRepresent.
     * @param {object} data
     */
    toRepresent(data = {}) {
        return getTimeInUptimeFormat(data[this.options.name]); /* globals getTimeInUptimeFormat */
    }
    /**
     * Redefinition of base guiField method _insertTestValue_imitateEvent.
     */
    _insertTestValue_imitateEvent(el) {
        el.dispatchEvent(new Event('blur'));
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.uptime);
    }
};

/**
 * Time_interval guiField class.
 * Field that gets time in milliseconds and convert it into seconds before render.
 * Before sending data to API it converts time from seconds to milliseconds.
 */
guiFields.time_interval = class TimeIntervalField extends guiFields.integer {
    /**
     * Redefinition of base guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        let value = data[this.options.name];

        if (!value) {
            return;
        }

        if (typeof value == 'object' && value.value) {
            return value.value;
        }

        return value;
    }
    /**
     * Method, that converse time in seconds to time in milliseconds.
     * @param {object} data Object with fields values.
     * @private
     */
    _toInner(data = {}) {
        let value = data[this.options.name];

        if (!value) {
            return;
        }

        return value * 1000;
    }
    /**
     * Redefinition of base guiField method toRepresent.
     * @param {object} data
     */
    toRepresent(data = {}) {
        let value = data[this.options.name];

        if (!value) {
            return;
        }

        if (typeof value == 'object' && value.represent_value) {
            return value.represent_value;
        }

        return value / 1000;
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.time_interval);
    }
};

/**
 * Crontab guiField class.
 */
guiFields.crontab = class CrontabField extends guiFields.base {
    /**
     * Custom method for toInner and toRepresent methods.
     * @param {object} data
     */
    _getValue(data = {}) {
        let value = data[this.options.name];

        if (!value) {
            return '* * * * *';
        }

        return value;
    }
    /**
     * Redefinition of base guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        return this._getValue(data);
    }
    /**
     * Redefinition of base guiField method toRepresent.
     * @param {object} data
     */
    toRepresent(data = {}) {
        return this._getValue(data);
    }
    /**
     * Redefinition of base guiField method _insertTestValue_imitateEvent.
     */
    _insertTestValue_imitateEvent(el) {
        el.dispatchEvent(new Event('blur'));
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.crontab);
    }
};

/**
 * JSON guiField class.
 */
guiFields.json = class JsonField extends guiFields.base {
    /**
     * Method, that inits all real fields of json field.
     */
    generateRealFields(value = {}) {
        let realFields = {};

        for (let field in value) {
            if (value.hasOwnProperty(field)) {
                let opt = {
                    name: field,
                    readOnly: this.options.readOnly || false,
                    title: field,
                    format: 'string',
                };

                if (typeof value[field] == 'boolean') {
                    opt.format = 'boolean';
                }

                realFields[field] = new guiFields[opt.format](opt);
            }
        }

        return realFields;
    }

    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.json);
    }
};

/**
 * Mixin for fk and api_object guiFields classes.
 * @param Class_name
 */
let fk_and_api_object_mixin = (Class_name) =>
    class extends Class_name {
        /**
         * Static method, that finds queryset by model's name in views of second nesting level.
         * @param {string} model_name Name Model to which autocomplete field links.
         */
        static findQuerySetSecondLevelPaths(model_name) {
            let views = app.views;
            let paths = Object.keys(views)
                .filter((item) => {
                    if (views[item].schema.level == 2) {
                        return item;
                    }
                })
                .sort((a, b) => {
                    return b.length - a.length;
                });

            for (let index = 0; index < paths.length; index++) {
                let p = paths[index];
                if (views[p].objects.model.name == model_name) {
                    return views[p].objects.clone();
                }
            }
        }
    };

/**
 * Api_object guiField class.
 */
guiFields.api_object = class ApiObjectField extends fk_and_api_object_mixin(guiFields.base) {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.api_object);
    }
    /**
     * Static method, that prepares field for usage.
     * @param {object} field Api_object field instance.
     * @param {string} path Name of View path.
     */
    static prepareField(field, path) {
        let constructor = new ViewConstructor(openapi_dictionary, app.models);
        let model = constructor.getViewSchema_model(field.options);

        if (!model) {
            return field;
        }

        let new_format = 'api_' + model.name.toLowerCase();

        if (guiFields[new_format]) {
            let opt = $.extend(true, {}, field.options, { format: new_format });
            let new_field = new guiFields[new_format](opt);

            if (guiFields[new_format].prepareField) {
                return guiFields[new_format].prepareField(new_field, path);
            }

            return new_field;
        }

        field.options.querysets = [this.findQuerySetSecondLevelPaths(model.name)];

        return field;
    }
};

/**
 * FK guiField class.
 */
guiFields.fk = class FkField extends fk_and_api_object_mixin(guiFields.base) {
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
        return super.mixins.concat(gui_fields_mixins.fk);
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
};

/**
 * MULTISELECT guiField class.
 * FK field, that allows to select several objects ta once.
 */
guiFields.multiselect = class MultiSelect extends guiFields.fk {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.multiselect);
    }
    /**
     * Redefinition of 'prefetchDataOrNot' method of FK guiField.
     * @param {object} data
     */
    prefetchDataOrNot(data = {}) {
        /* jshint unused: false */
        return false;
    }
    /**
     * Redefinition of 'toInner' method of base guiField.
     * @param {object} data
     */
    toInner(data = {}) {
        let value = data[this.options.name];

        if (value && typeof value == 'object' && Array.isArray(value)) {
            return value
                .map((item) => {
                    return item.value;
                })
                .join(this.options.additionalProperties.view_separator);
        }

        return value;
    }
    /**
     * Redefinition of 'toRepresent' method of base guiField.
     * @param {object} data
     */
    toRepresent(data = {}) {
        let value = data[this.options.name];

        if (value && typeof value == 'object' && Array.isArray(value)) {
            return value
                .map((item) => {
                    return item.prefetch_value;
                })
                .join(this.options.additionalProperties.view_separator);
        }

        return value;
    }
};

/**
 * FK_autocomplete guiField class.
 */
guiFields.fk_autocomplete = class FkAutocompleteField extends guiFields.fk {
    /**
     * Redefinition of fk guiField method _insertTestValue.
     */
    _insertTestValue(data = {}) {
        let value = data[this.options.name];
        let format = this.options.format || this.options.type;
        let el = this._insertTestValue_getElement(format);

        $(el).val(value);

        this._insertTestValue_imitateEvent(el);
    }
    /**
     * Redefinition of fk guiField method _insertTestValue_getElement.
     */
    _insertTestValue_getElement(format) {
        let selector = '.guifield-' + format + '-' + this.options.name + ' input';
        return $(selector)[0];
    }
    /**
     * Redefinition of fk guiField method _insertTestValue_imitateEvent.
     */
    _insertTestValue_imitateEvent(el) {
        el.dispatchEvent(new Event('blur'));
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.fk_autocomplete);
    }
};

/**
 * FK_multi_autocomplete guiField class.
 */
guiFields.fk_multi_autocomplete = class FkMultiAutocompleteField extends guiFields.fk_autocomplete {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.fk_multi_autocomplete);
    }
};

/**
 * Color guiField class.
 */
guiFields.color = class ColorField extends guiFields.base {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.color);
    }
    /**
     * Custom method for toInner and toRepresent methods.
     * @param {object} data
     */
    _getValue(data = {}) {
        let value = data[this.options.name];

        if (!value) {
            return '#000000';
        }

        return value;
    }
    /**
     * Redefinition of base guiField method toInner.
     * @param {object} data
     */
    toInner(data = {}) {
        return this._getValue(data);
    }
    /**
     * Redefinition of base guiField method toRepresent.
     * @param {object} data
     */
    toRepresent(data = {}) {
        return this._getValue(data);
    }
};

/**
 * Inner_api_object guiField class.
 */
guiFields.inner_api_object = class InnerApiObjectField extends guiFields.base {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.inner_api_object);
    }

    /**
     * Static method, that recursively find model, connected with this field.
     * @param {object} field Inner_api_object field instance.
     */
    static getModel(field) {
        let constructor = new ViewConstructor(openapi_dictionary, app.models);
        return constructor.getViewSchema_model(field.options);
    }

    /**
     * Static method, that prepares field for usage.
     * @param {object} field Inner_api_object field instance.
     * @param {string} path Name of View path.
     */
    static prepareField(field, path) {
        /* jshint unused: false */
        let model = this.getModel(field);

        if (!model) {
            console.error(
                "Model was not found in static method 'prepareField'" +
                    ' of guiFields.inner_api_object class',
            );
            return field;
        }

        let realFields = {};

        for (let key in model.fields) {
            if (model.fields.hasOwnProperty(key)) {
                let inner_field = model.fields[key];
                let inner_model = this.getModel(inner_field);
                realFields[key] = {};

                for (let item in inner_model.fields) {
                    if (Object.keys(inner_model.fields).length == 1) {
                        let f = inner_model.fields[item];
                        let opt = $.extend(true, { required: field.options.required }, f.options, {
                            title: '{0} - {1}'.format(key, item),
                        });

                        realFields[key][item] = new guiFields[f.options.format](opt);
                    } else {
                        realFields[key][item] = inner_model.fields[item];
                        realFields[key][item].options = $.extend(
                            true,
                            { required: field.options.required },
                            inner_model.fields[item].options,
                        );
                    }
                }
            }
        }

        field.options.realFields = realFields;

        return field;
    }
    /**
     * Redefinition of base guiField static property 'validateValue'.
     */
    validateValue(data = {}) {
        let val = data[this.options.name] || {};
        let valid = {};

        for (let key in this.options.realFields) {
            if (this.options.realFields.hasOwnProperty(key)) {
                valid[key] = {};

                for (let item in this.options.realFields[key]) {
                    if (this.options.realFields[key].hasOwnProperty(item)) {
                        valid[key][item] = this.options.realFields[key][item].validateValue(val[key]);
                    }
                }
            }
        }

        return valid;
    }
};

/**
 * Api_data guiField class.
 */
guiFields.api_data = class ApiDataField extends guiFields.base {};

/**
 * Dynamic guiField class.
 */
guiFields.dynamic = class DynamicField extends guiFields.base {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.dynamic);
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

        if (!guiFields[opt.format]) {
            opt.format = 'string';
        }

        let real_field = new guiFields[opt.format](opt);

        if (real_field.constructor.prepareField) {
            real_field = real_field.constructor.prepareField(real_field, app.application.$route.name);
        }

        return real_field;
    }
};

/**
 * Hidden guiField class.
 */
guiFields.hidden = class HiddenField extends guiFields.base {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.hidden);
    }
};

/**
 * Form guiField class.
 */
guiFields.form = class FormField extends guiFields.base {
    /**
     * Redefinition of base guiField constructor.
     */
    constructor(options = {}) {
        super(options);
    }
    /**
     * Method, that makes some manipulations with value.
     * @param {object} value Field value.
     * @param {string} method Method, that will called.
     * @private
     */
    _getValue(data, method) {
        let val = {};

        let realFields = this.generateRealFields();

        for (let key in realFields) {
            if (realFields.hasOwnProperty(key)) {
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
                if (this.options.form.hasOwnProperty(key)) {
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
        let field = new guiFields[options.format](options);

        if (field.constructor.prepareField) {
            field = field.constructor.prepareField(field, app.application.$route.name);
        }

        return field;
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.form);
    }
};

/**
 * Button guiField class.
 */
guiFields.button = class ButtonField extends guiFields.base {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.button);
    }
};

/**
 * String array guiField class.
 */
guiFields.string_array = class StringArrayField extends guiFields.textarea {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.string_array);
    }
};

/**
 * String id guiField class.
 * This class if for string fields, that is supposed to be used in URLs as 'id' key.
 * This class has additional validation, that checks, that field's value is not equal to some other URL keys:
 * - new;
 * - edit;
 * - remove.
 */
guiFields.string_id = class StringIdField extends guiFields.string {
    /**
     * Custom method for validateValue method.
     * @param {object} data
     */
    validateValueCustom(data = {}) {
        let value = data[this.options.name];
        let samples = pop_up_msg.field.error;
        let title = (this.options.title || this.options.name).toLowerCase();
        let exclude_values = ['new', 'edit', 'remove'];
        let $t = _translate;

        if (value && exclude_values.includes(value)) {
            throw {
                error: 'validation',
                message: $t(samples.invalid).format([value, $t(title)]),
            };
        }

        return value;
    }
    /**
     * Custom method for toInner and toRepresent methods.
     * @param {object} data
     */
    _getValue(data = {}) {
        let value = data[this.options.name];

        if (value !== undefined && value !== null) {
            return String(value).replace(/-/g, '_');
        }
    }
    /**
     * Redefinition of 'toInner' method of string guiField.
     */
    toInner(data = {}) {
        return this._getValue(data);
    }
    /**
     * Redefinition of 'toInner' method of string guiField.
     */
    toRepresent(data = {}) {
        return this._getValue(data);
    }
};

export default guiFields;
