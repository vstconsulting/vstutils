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
import * as innerApiObject from './inner-api-object';
import * as json from './json';
import * as multiselect from './multiselect';
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
    innerApiObject,
    json,
    multiselect,
    numbers,
    password,
    text,
};

import * as apiData from './api-data.js';
import * as color from './color.js';
import * as email from './email.js';
import * as hidden from './hidden.js';
export { apiData, color, email, hidden };

import BaseModalWindowForInstanceList from './BaseModalWindowForInstanceList.vue';
import FieldLabelIdMixin from './FieldLabelIdMixin.js';
import ModalWindowAndButtonMixin from './ModalWindowAndButtonMixin.js';
import TableRowMixin from './TableRowMixin.js';
export { BaseModalWindowForInstanceList, FieldLabelIdMixin, ModalWindowAndButtonMixin, TableRowMixin };

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
            return 'api_object';
        }

        if (fields.has(fieldOptions.type)) {
            return fieldOptions.type;
        }

        console.warn('Default field format is used');
        return 'string';
    };
}

/**
 * Function, that returns format for field options.
 * @param {object} fieldOptions - Object with field options.
 */
export const getFieldFormat = getFieldFormatFactory(globalFields);
