import { globalFields, guiFields } from './fields.js';

export { globalFields, guiFields };

import * as apiObject from './api-object';
import * as autocomplete from './autocomplete';
import * as base from './base';
import * as boolean from './boolean';
import * as choices from './choices';
import * as crontab from './crontab';
import * as datetime from './datetime';
import * as dynamic from './dynamic';
import * as files from './files';
import * as fk from './fk';
import * as form from './form';
import * as json from './json';
import * as multiselect from './multiselect';
import * as nestedObject from './nested-object.js';
import * as numbers from './numbers';
import * as password from './password';
import * as text from './text';
export {
    apiObject,
    autocomplete,
    base,
    boolean,
    choices,
    crontab,
    datetime,
    dynamic,
    files,
    fk,
    form,
    json,
    multiselect,
    nestedObject,
    numbers,
    password,
    text,
};

import * as apiData from './api-data.js';
import * as color from './color.js';
import * as email from './email.js';
import * as hidden from './hidden.js';
import * as staticValue from './static-value.js';
export { apiData, color, email, hidden, staticValue };

import FieldLabelIdMixin from './FieldLabelIdMixin.js';
import ModalWindowAndButtonMixin from './ModalWindowAndButtonMixin.js';
import TableRowMixin from './TableRowMixin.js';
import $ from 'jquery';
export { FieldLabelIdMixin, ModalWindowAndButtonMixin, TableRowMixin };

/**
 * Method, that creates new getFieldFormat function for given fields map.
 * @param {Map<string, BaseField>} fields
 */
export function getFieldFormatFactory(fields) {
    /**
     * Function, that returns format for field options.
     * @param {object} fieldOptions - Object with field options.
     */
    return function getFieldFormat(fieldOptions) {
        if (fields.has(fieldOptions.format)) {
            return fieldOptions.format;
        }

        if (fieldOptions.enum) {
            return 'choices';
        }

        if (Object.keys(fieldOptions).includes('$ref')) {
            return 'nested-object';
        }

        if (fields.has(fieldOptions.type)) {
            return fieldOptions.type;
        }

        console.warn('Default field format is used', fieldOptions);
        return 'string';
    };
}

/**
 * @param {Map<string, BaseField>} fields
 */
export function getFieldFactory(fields) {
    const getFieldFormat = getFieldFormatFactory(fields);

    /**
     * @param {string} [fieldName]
     * @param {string|Object} options
     */
    return function getField(fieldName, options) {
        if (options instanceof base.BaseField) return options;
        if (!fieldName) fieldName = options.name;
        if (typeof options === 'string') options = { format: options };
        const FieldClass = fields.get(getFieldFormat(options));

        return new FieldClass(
            $.extend(true, {}, options, {
                name: fieldName,
                format: this.getFieldFormat(options),
            }),
        );
    };
}

/**
 * Function, that returns format for field options.
 * @param {object} fieldOptions - Object with field options.
 */
export const getFieldFormat = getFieldFormatFactory(globalFields);
