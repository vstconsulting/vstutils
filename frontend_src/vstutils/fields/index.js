import { guiFields } from './fields.js';
import mixins from './mixins.js';
import gui_fields_mixins from './fieldsMixins';
import fieldsRegistrator from './fieldsRegistrator.js';

Object.assign(window, mixins);
window.gui_fields_mixins = gui_fields_mixins;
window.fieldsRegistrator = fieldsRegistrator;
window.guiFields = guiFields;

export { mixins, gui_fields_mixins, guiFields, fieldsRegistrator };

import * as apiObject from './api-object';
import * as autocomplete from './autocomplete';
import * as base from './base';
import * as boolean from './boolean';
import * as button from './button';
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
    button,
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
import FKandAPIObjectMixin from './FKandAPIObjectMixin.js';
import HideFieldInTableMixin from './HideFieldInTableMixin.js';
import MainPagination from './MainPagination.vue';
import ModalWindowAndButtonMixin from './ModalWindowAndButtonMixin.js';
import TableRowMixin from './TableRowMixin.js';
export {
    BaseModalWindowForInstanceList,
    FieldLabelIdMixin,
    FKandAPIObjectMixin,
    HideFieldInTableMixin,
    MainPagination,
    ModalWindowAndButtonMixin,
    TableRowMixin,
};
