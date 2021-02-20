import $ from 'jquery';
import moment from 'moment';
import { LocalSettings } from './localSettings';

export const guiLocalSettings = new LocalSettings('guiLocalSettings');

/**
 * Function to replace {.+?} in string to variables sended to this function,
 * array and single variable set ordered inside string
 * associative array and iterable objects set value for keys that original string have
 * @param {*} takes array, associative array or single variable and insert it
 * @return {string} - return string with inserted arguments
 */
String.prototype.format = function () {
    let obj = this.toString();
    let arg_list;

    if (typeof arguments[0] == 'object') {
        arg_list = arguments[0];
    } else if (arguments.length >= 1) {
        arg_list = Array.from(arguments);
    }

    for (let key of this.format_keys()) {
        if (arg_list[key] !== undefined) {
            obj = obj.replace('{' + key + '}', arg_list[key]);
        } else {
            throw "String don't have '" + key + "' key";
        }
    }

    return obj;
};

/**
 * Function search and return all `{key}` in string.
 * @return {array} array of {key} in string.
 */
String.prototype.format_keys = function () {
    let thisObj = this;
    let res = thisObj.match(/{([^}]+)}/g);

    if (!res) {
        return [];
    }

    return res.map((item) => {
        return item.slice(1, item.length - 1);
    });
};

/**
 * Function, that removes spaces symbols from the begging and from the end of string.
 * @param {string} s.
 */
export function trim(s) {
    if (s) {
        return s.replace(/^ */g, '').replace(/ *$/g, '');
    }
    return '';
}

/**
 * Function returns capitalized string - first char is in UpperCase, others - in LowerCase.
 * @param {string} string String, that should be capitalized.
 * @return {string}
 */
export function capitalize(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

/**
 * Function returns shorten version of string.
 * @param {string} string String, that should be shorten.
 * @param {number} valid_length Max length of string.
 * @return {string}
 */
export function sliceLongString(string = '', valid_length = 100) {
    if (typeof string != 'string') {
        return sliceLongString('' + string, valid_length);
    }

    let str = string.slice(0, valid_length);

    if (string.length > valid_length) {
        str += '...';
    }

    return str;
}

/**
 * Function returns true if object has no attributes, otherwise it returns false.
 * @param {object} obj Object, that should be checked.
 * @returns {boolean}
 */
export function isEmptyObject(obj) {
    if (Array.isArray(obj) && obj.length === 0) {
        return true;
    }
    for (let key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
}

/**
 * Function forms names of CSS classes, based on input arguments, and return them.
 * @param {string} element Name of element.
 * @param {string} title Title of element
 * @param {string} type Type of element.
 * @return {string} String with CSS classes names.
 */
export function addCssClassesToElement(element = '', title = '', type = '') {
    element = element.replace(/[\s/]+/g, '_');

    let class_list = element + ' ';

    if (title) {
        title = title.replace(/[\s/]+/g, '_');
        class_list += element + '-' + title + ' ';
    }

    if (title && type) {
        type = type.replace(/[\s/]+/g, '_');
        class_list += element + '-' + type + ' ';
        class_list += element + '-' + type + '-' + title;
    }

    return class_list.toLowerCase();
}

/**
 * Function returns value of cookie, is it exists.
 * @param {string} name Name of cookie.
 * @return {string|null}
 */
export function getCookie(name) {
    let nameEQ = name + '=';
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) === 0) {
            return c.substring(nameEQ.length, c.length);
        }
    }
    return null;
}

/**
 * Function saves 'hideMenu' options to guiLocalSettings.
 * Function is supposed to be called when push-menu button was clicked.
 */
export function saveHideMenuSettings() {
    if (window.innerWidth > 991) {
        if ($('body').hasClass('sidebar-collapse')) {
            guiLocalSettings.set('hideMenu', false);
        } else {
            guiLocalSettings.set('hideMenu', true);
        }
    }
}

/**
 * https://stackoverflow.com/a/25456134/7835270
 * @param {Object} x
 * @param {Object} y
 * @returns {Boolean}
 */
export function deepEqual(x, y) {
    if (x === y) {
        return true;
    }
    if (typeof x == 'object' && x != null && typeof y == 'object' && y != null) {
        if (Object.keys(x).length !== Object.keys(y).length) {
            return false;
        }

        for (let prop in x) {
            if (Object.prototype.hasOwnProperty.call(y, prop)) {
                if (!deepEqual(x[prop], y[prop])) {
                    return false;
                }
            } else {
                return false;
            }
        }
        return true;
    } else return false;
}

/**
 * Function checks string for keeping boolean value
 * @param {string} string - string, which we want to check on boolean value
 * @returns {Boolean}
 */
export function stringToBoolean(string) {
    if (string == null) {
        return false;
    }

    switch (string.toLowerCase().trim()) {
        case 'true':
        case 'yes':
        case '1':
            return true;
        case 'false':
        case 'no':
        case '0':
        case null:
            return false;
    }
}

/**
 * Function converts numbers from 0 to 9 into 00 to 09.
 * @param n(number) - number
 */
export function oneCharNumberToTwoChar(n) {
    return n > 9 ? '' + n : '0' + n;
}

/**
 * Function checks that all properties of object are also objects.
 * @param {object} obj Some object.
 * @return {boolean}.
 */
export function allPropertiesIsObjects(obj) {
    for (let prop in obj) {
        if (typeof obj[prop] != 'object') {
            return false;
        } else {
            if (Array.isArray(obj[prop])) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Function, that converts instance of ArrayBuffer to Base64.
 * @param {ArrayBuffer} buffer Instance of ArrayBuffer.
 * @return {string}
 */
export function arrayBufferToBase64(buffer) {
    let binary = '';
    let bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;

    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return window.btoa(binary);
}

/**
 * Function, that forms random string and returns it.
 * @param {number} length String's length.
 * @param {string} abc String with chars, that can be used in random string.
 * @return {string}
 */
export function randomString(length, abc = 'qwertyuiopasdfghjklzxcvbnm012364489') {
    let res = '';

    for (let i = 0; i < length; i++) {
        res += abc[Math.floor(Math.random() * abc.length)];
    }

    return res;
}

/*
 * 2 handlers, that removes CSS-class 'hover-li' from menu elements, after losing focus on them.
 */
$('.content-wrapper').hover(function () {
    $('.hover-li').removeClass('hover-li');
});

$('.navbar').hover(function () {
    $('.hover-li').removeClass('hover-li');
});

/**
 * Function converts color from hex to rgba.
 * @param {string} hex String with hex color (#fefefe).
 * @param {number} alpha Opacity amount in rgba color (0-1).
 */
export function hexToRgbA(hex, alpha = 1) {
    if (typeof alpha != 'number') {
        alpha = Number(alpha);
        if (isNaN(alpha)) {
            alpha = 1;
        }
    }

    if (alpha < 0 || alpha > 1) {
        alpha = 1;
    }

    let c;

    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');

        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }

        c = '0x' + c.join('');

        return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
    }
}

/**
 * Function returns time in uptime format.
 * @param time {number} - time in seconds.
 */
export function getTimeInUptimeFormat(time) {
    if (isNaN(time)) {
        return '00:00:00';
    }

    let uptime = moment.duration(Number(time), 'seconds')._data;

    let n = oneCharNumberToTwoChar;

    if (uptime.years > 0) {
        return (
            n(uptime.years) +
            'y ' +
            n(uptime.months) +
            'm ' +
            n(uptime.days) +
            'd ' +
            n(uptime.hours) +
            ':' +
            n(uptime.minutes) +
            ':' +
            n(uptime.seconds)
        );
    } else if (uptime.months > 0) {
        return (
            n(uptime.months) +
            'm ' +
            n(uptime.days) +
            'd ' +
            n(uptime.hours) +
            ':' +
            n(uptime.minutes) +
            ':' +
            n(uptime.seconds)
        );
    } else if (uptime.days > 0) {
        return n(uptime.days) + 'd ' + n(uptime.hours) + ':' + n(uptime.minutes) + ':' + n(uptime.seconds);
    } else {
        return n(uptime.hours) + ':' + n(uptime.minutes) + ':' + n(uptime.seconds);
    }
}

Object.defineProperty(Array.prototype, 'last', {
    get: function () {
        return this[this.length - 1];
    },
});

/**
 * Class, that defines enumerable and non_enumerable properties of some object.
 * This class make recursive search in all chain of object prototypes.
 * For example, we have some object, that is instance of SomeClass2.
 * SomeClass2 is a child of SomeClass1.
 * SomeClass1 is a child of Object Class.
 * So, ObjectPropertyRetriever will find all properties of SomeClass2, SomeClass1, Object
 * prototypes.
 */
export class ObjectPropertyRetriever {
    /**
     * Constructor of ObjectPropertyRetriever Class.
     */
    constructor() {
        /**
         * This property, stores enumerable properties
         * of Object Class constructor prototype.
         */
        this.ob_proto_attrs = this.constructor.getObjectConstructorProperties;
        /**
         * This property, stores non_enumerable properties
         * of Object Class constructor prototype.
         */
        this.obj_proto_methods = this.constructor.getObjectConstructorMethods;
    }
    /**
     * Static property, that returns enumerable properties
     * of Object Class constructor prototype.
     */
    static get getObjectConstructorMethods() {
        return Object.getOwnPropertyNames(Object.constructor.prototype);
    }
    /**
     * Static property, that returns non_enumerable properties
     * of Object Class constructor prototype.
     */
    static get getObjectConstructorProperties() {
        return Object.keys({}.constructor.prototype);
    }
    /**
     * Method, that returns true, if prop is enumerable property of obj.
     * Otherwise, returns false.
     * @param {object} obj Object, that we want to check.
     * @param {string} prop Property, that we want to check.
     * @returns {boolean}
     * @private
     */
    _enumerable(obj, prop) {
        return Object.prototype.propertyIsEnumerable.call(obj, prop);
    }
    /**
     * Method, that returns true, if prop is non_enumerable property of obj.
     * Otherwise, returns false.
     * @param {object} obj Object, that we want to check.
     * @param {string} prop Property, that we want to check.
     * @returns {boolean}
     * @private
     */
    _notEnumerable(obj, prop) {
        return !Object.prototype.propertyIsEnumerable.call(obj, prop);
    }
    /**
     * Method, that returns true, if prop is enumerable or non_enumerable property of obj.
     * @param {object} obj Object, that we want to check.
     * @param {string} prop Property, that we want to check.
     * @returns {boolean}
     * @private
     */
    // eslint-disable-next-line no-unused-vars
    _enumerableAndNotEnumerable(obj, prop) {
        return true;
    }
    /**
     * Method, that returns names of object properties, that satisfy search arguments.
     * @param {object} obj Object, that we want to check.
     * @param {boolean} iterateSelfBool Means, make search inside obj or not.
     * @param {boolean} iteratePrototypeBool Means, make search inside obj prototypes or not.
     * @param {function} includePropCb Method, that checks: property satisfies or not.
     * @private
     */
    _getPropertyNames(obj, iterateSelfBool, iteratePrototypeBool, includePropCb) {
        let props = [];

        function func(prop) {
            if (props.indexOf(prop) === -1 && includePropCb(obj, prop)) {
                props.push(prop);
            }
        }

        do {
            if (iterateSelfBool) {
                Object.getOwnPropertyNames(obj).forEach(func);
            }

            if (!iteratePrototypeBool) {
                break;
            }

            iterateSelfBool = true;
            obj = Object.getPrototypeOf(obj);
        } while (obj);

        return props;
    }
    /**
     * Method, that returns obj's own enumerable properties.
     * @param {object} obj Object, that we want to check.
     */
    getOwnEnumerables(obj) {
        return this._getPropertyNames(obj, true, false, this._enumerable);
    }
    /**
     * Method, that returns obj's own non_enumerable properties.
     * @param {object} obj Object, that we want to check.
     */
    getOwnNonenumerables(obj) {
        return this._getPropertyNames(obj, true, false, this._notEnumerable);
    }
    /**
     * Method, that returns obj's own enumerable and non_enumerable properties.
     * @param {object} obj Object, that we want to check.
     */
    getOwnEnumerablesAndNonenumerables(obj) {
        return this._getPropertyNames(obj, true, false, this._enumerableAndNotEnumerable);
    }
    /**
     * Method, that returns obj's prototypes enumerable properties.
     * @param {object} obj Object, that we want to check.
     * @param {boolean} obj_proto Means, include or not properties of Object Class prototype.
     */
    getPrototypeEnumerables(obj, obj_proto = true) {
        let props = this._getPropertyNames(obj, false, true, this._enumerable);

        if (!obj_proto) {
            return props.filter((item) => !this.ob_proto_attrs.includes(item));
        }

        return props;
    }
    /**
     * Method, that returns obj's prototypes non_enumerable properties.
     * @param {object} obj Object, that we want to check.
     * @param {boolean} obj_proto Means, include or not properties of Object Class prototype.
     */
    getPrototypeNonenumerables(obj, obj_proto = true) {
        let props = this._getPropertyNames(obj, false, true, this._notEnumerable);

        if (!obj_proto) {
            return props.filter((item) => !this.obj_proto_methods.includes(item));
        }

        return props;
    }
    /**
     * Method, that returns obj's prototypes enumerable and non_enumerable properties.
     * @param {object} obj Object, that we want to check.
     * @param {boolean} obj_proto Means, include or not properties of Object Class prototype.
     */
    getPrototypeEnumerablesAndNonenumerables(obj, obj_proto = true) {
        let props = this._getPropertyNames(obj, false, true, this._enumerableAndNotEnumerable);

        if (!obj_proto) {
            return props.filter(
                (item) => !(this.obj_proto_methods.includes(item) || this.ob_proto_attrs.includes(item)),
            );
        }

        return props;
    }
    /**
     * Method, that returns obj's own and prototypes enumerable properties.
     * @param {object} obj Object, that we want to check.
     * @param {boolean} obj_proto Means, include or not properties of Object Class prototype.
     */
    getOwnAndPrototypeEnumerables(obj, obj_proto = true) {
        let props = this._getPropertyNames(obj, true, true, this._enumerable);

        if (!obj_proto) {
            return props.filter((item) => !this.ob_proto_attrs.includes(item));
        }

        return props;
    }
    /**
     * Method, that returns obj's own and prototypes non_enumerable properties.
     * @param {object} obj Object, that we want to check.
     * @param {boolean} obj_proto Means, include or not properties of Object Class prototype.
     */
    getOwnAndPrototypeNonenumerables(obj, obj_proto = true) {
        let props = this._getPropertyNames(obj, true, true, this._notEnumerable);

        if (!obj_proto) {
            return props.filter((item) => !this.obj_proto_methods.includes(item));
        }

        return props;
    }
    /**
     * Method, that returns obj's own and prototypes enumerable and non_enumerable properties.
     * @param {object} obj Object, that we want to check.
     * @param {boolean} obj_proto Means, include or not properties of Object Class prototype.
     */
    getOwnAndPrototypeEnumerablesAndNonenumerables(obj, obj_proto = true) {
        let props = this._getPropertyNames(obj, true, true, this._enumerableAndNotEnumerable);

        if (!obj_proto) {
            return props.filter(
                (item) => !(this.obj_proto_methods.includes(item) || this.ob_proto_attrs.includes(item)),
            );
        }

        return props;
    }
}

/**
 * Instance of ObjectPropertyRetriever class.
 */
export const obj_prop_retriever = new ObjectPropertyRetriever();

/**
 * Function, that finds the most appropriate (closest) path from path array to current_path.
 * It's supposed, that values in 'paths' array' were previously sorted.
 * It's supposed, that 'paths' array does not contain all application paths.
 * @param {array} paths Array with paths({string}).
 * @param {string} current_path Path, based on which function makes search.
 */
export function findClosestPath(paths, current_path) {
    let c_p_parts = current_path.replace(/^\/|\/$/g, '').split('/');

    let matches = [];

    for (let index = 0; index < paths.length; index++) {
        let path = paths[index];
        let path_paths = path.replace(/^\/|\/$/g, '').split('/');

        matches.push({
            path: path,
            match: 0,
        });

        for (let num = 0; num < c_p_parts.length; num++) {
            let item = c_p_parts[num];

            if (item === path_paths[num]) {
                matches.last.match++;
            } else {
                break;
            }
        }
    }

    matches = matches.sort((a, b) => {
        // return a.match - b.match;
        return a.match - b.match + b.path.split('/').length - a.path.split('/').length;
    });

    if (matches.last && matches.last.path && matches.last.match > 0) {
        return matches.last.path;
    }
}

/**
 * Function, that returns translation of string.
 * @param {string} str - String to translate.
 * @return {string}
 * @private
 */
export function _translate(str) {
    if (window.app && window.app.application && window.app.application.$t) {
        return window.app.application.$t(str);
    }

    return str;
}

/**
 * Variable, that is responsible for 3rd level path keys.
 * For example, if path_pk_key == 'pk', all variables in js, that work with paths will contain current value:
 * - /user/{pk}/.
 * If path_pk_key == 'id':
 * - /user/{id}/.
 * It is supposed, that OpenAPI schema will use 'path_pk_key' value as pk_key for 3rd level paths.
 */
export let path_pk_key = 'id';

/**
 * Returns joined dependence field values of data for given fieldName using separator
 * or undefined if data has no such fieldName
 *
 * @param value
 * @param {string} separator
 * @return {string | undefined}
 */
export function getDependenceValueAsString(value, separator = ',') {
    if (Array.isArray(value)) {
        return value.map((item) => (item.getPkValue ? item.getPkValue() : item)).join(separator);
    } else if (typeof value === 'string' || typeof value === 'number') {
        return value;
    }
}

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Deep merge two objects, for arrays inside source objects shallow copy will be created.
 * @param {Object} target
 * @param {...Object} sources
 */
export function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                mergeDeep(target[key], source[key]);
            } else if (Array.isArray(source[key])) {
                target[key] = source[key].slice();
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return mergeDeep(target, ...sources);
}

/**
 * Helper that wraps Map and allows to set/get in object style
 * @param {Map} map
 * @return {Object}
 */
export function mapToObjectProxy(map) {
    return new Proxy(map, {
        get(target, p) {
            return target.get(p);
        },
        set(target, p, value) {
            target.set(p, value);
            return true;
        },
    });
}

/**
 * Template literal that formats strings. Strings and integers can be used as keys.
 *
 * @example
 * const str = template`This is ${'type'} #${0}`;
 * // returns "This is text #2"
 * str(2, { type: text });
 *
 * @param strings
 * @param keys
 * @return {function(...[*]): string}
 */
export function template(strings, ...keys) {
    return function (...values) {
        let dict = values[values.length - 1] || {};
        let result = [strings[0]];
        keys.forEach(function (key, i) {
            let value = Number.isInteger(key) ? values[key] : dict[key];
            result.push(value, strings[i + 1]);
        });
        return result.join('');
    };
}

/**
 * @typedef {string} RequestType
 */

/**
 * Enum for request types
 * @enum {RequestType}
 */
export const RequestTypes = {
    LIST: 'list',
    RETRIEVE: 'retrieve',
    CREATE: 'create',
    UPDATE: 'update',
    PARTIAL_UPDATE: 'partialUpdate',
    REMOVE: 'remove',
};

/**
 * @typedef {string} HttpMethod
 */

/**
 * Enum for HTTP methods
 * @enum {HttpMethod}
 */
export const HttpMethods = {
    GET: 'get',
    POST: 'post',
    PUT: 'put',
    PATCH: 'patch',
    DELETE: 'delete',

    ALL: ['get', 'post', 'put', 'patch', 'delete'],
};

/**
 * Enum for HTTP methods
 */
export const FieldViews = {
    LIST: 'list',
    READ_ONLY: 'readonly',
    EDIT: 'edit',
};

/**
 * Function that formats path from params and replaces last param with instance's id
 * @param {string} path
 * @param {Object} params
 * @param {Model} instance
 * @return {string}
 */
export function formatPath(path, params, instance = null) {
    for (const [name, value] of Object.entries(params)) {
        path = path.replace(`{${name}}`, value);
    }

    if (instance) {
        return path.replace(/{.+}/, instance.getPkValue());
    }

    return path;
}

/**
 * Method, that converts query object into string
 *
 * @param {(string|object|URLSearchParams)=} query
 * @param {boolean} useBulk - If false adds question mark (?) in front of string
 * @returns {string}
 */
export function makeQueryString(query = undefined, useBulk = false) {
    let queryStr = '';
    if (typeof query === 'string') {
        queryStr = new URLSearchParams(query).toString();
    } else if (typeof query === 'object') {
        queryStr = new URLSearchParams(Object.entries(query)).toString();
    } else if (query instanceof URLSearchParams) {
        queryStr = query.toString();
    }

    if (!useBulk && queryStr !== '') queryStr = `?${queryStr}`;

    return queryStr;
}

export function copyToClipboard(value) {
    if (typeof navigator.clipboard == 'undefined') {
        // navigator.clipboard available only in secure context
        const textArea = document.createElement('textarea');
        textArea.value = value;
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.warning('Was not possible to copy text: ', err);
        }
        document.body.removeChild(textArea);
    } else {
        navigator.clipboard.writeText(value || '').catch(console.warn);
    }
}

export function downloadBase64File(contentType, base64Data, fileName) {
    const linkSource = `data:${contentType};base64,${base64Data}`;
    const downloadLink = document.createElement('a');
    downloadLink.href = linkSource;
    downloadLink.download = fileName;
    downloadLink.click();
}

export const ViewTypes = {
    LIST: 'list',
    PAGE: 'page',
    PAGE_NEW: 'page_new',
    PAGE_EDIT: 'page_edit',
    PAGE_REMOVE: 'page_remove',
    ACTION: 'action',
};

/**
 * Function that returns promise which will resolve after given time interval.
 * @param {number} ms
 * @return {Promise}
 */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The maximum is exclusive and the minimum is inclusive
 * @param {number} min
 * @param {number} max
 * @return {number}
 */
export function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

/**
 * Function that returns promise which will resolve after random time interval in given range.
 * @param {number} min
 * @param {number} max
 * @return {Promise}
 */
export function randomSleep(min, max) {
    return sleep(getRandomInt(min, max));
}

/**
 * @param url
 * @return {Promise<Image>}
 */
export async function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', reject);
        img.src = url;
    });
}

/**
 * @param {File|Blob} file
 * @return {Promise<string>}
 */
export function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', (loadEvent) => resolve(loadEvent.target.result));
        reader.addEventListener('error', reject);
        reader.readAsDataURL(file);
    });
}

/**
 * Escape string so it can be safe used in html
 * @param {string} unsafe
 * @return {string}
 */
export function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Removes base64 prefix from content of the file
 * @param {string} content
 * @return {string}
 */
export function removeBase64Prefix(content) {
    return content.slice(content.indexOf(',') + 1);
}

/**
 * Function that reads file to vstutils named binary files format
 * @param {File} file
 * @return {Promise<Object>}
 */
export async function readFileAsObject(file) {
    return {
        name: file.name || null,
        content: removeBase64Prefix(await readFileAsDataUrl(file)),
        mediaType: file.type || null,
    };
}

/**
 *
 * @param file {object}
 * @return {{url: string}}
 */

export function makeDataImageUrl(file) {
    return {
        url: `data:${file.mediaType || 'image/png'};base64,${file.content}`,
    };
}
