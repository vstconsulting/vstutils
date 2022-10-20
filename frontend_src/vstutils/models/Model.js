import { escapeHtml, hasOwnProp, mergeDeep, ModelValidationError } from '../utils';

class ModelUtils {
    static pkFields = ['id', 'pk'];

    static getPrototypes(cls, parents = [cls]) {
        const proto = Object.getPrototypeOf(cls);
        if (proto !== null) {
            parents.push(proto);
            ModelUtils.getPrototypes(proto, parents);
        }
        return parents;
    }

    /**
     * @param cls
     * @return {Map<string, BaseField>}
     */
    static getFields(cls) {
        const fields = new Map();
        const prototypes = ModelUtils.getPrototypes(cls).reverse();

        for (const proto of prototypes) {
            for (const field of proto.declaredFields || []) {
                fields.set(field.name, field);
            }
        }

        return fields;
    }

    static getPkField(cls) {
        if (!cls.fields.size) return null;

        if (cls.pkFieldName) return cls.fields.get(cls.pkFieldName);

        for (const name of cls.fields.keys()) {
            if (ModelUtils.pkFields.includes(name)) {
                return cls.fields.get(name);
            }
        }

        // If no fields found then return name of first field
        return cls.fields.values().next().value;
    }

    static getViewField(cls) {
        if (cls.fields.has(cls.viewFieldName)) {
            return cls.fields.get(cls.viewFieldName);
        }
        return cls.pkField;
    }
}

/**
 * @typedef {Function} RawModel
 * @property {BaseField[]} [declaredFields]
 * @property {string} [viewFieldName]
 * @property {string} [pkFieldName]
 */

/**
 * @function ModelClass_innerFunction
 * @param {RawModel} cls
 * @return {Function}
 */

/**
 * @param {RawModel} cls
 * @param {string} [name]
 * @return {Function}
 */
export function makeModel(cls, name) {
    // Set model name
    name = name || cls.name;
    if (name) {
        const nameParameters = { value: name, writable: false };
        Object.defineProperty(cls, 'name', nameParameters);
        Object.defineProperty(cls.prototype, '_name', nameParameters);
    }

    // Set fields
    const fields = ModelUtils.getFields(cls);
    for (const field of fields.values()) field.model = cls;
    Object.defineProperty(cls, 'fields', { value: fields, writable: true });
    Object.defineProperty(cls.prototype, '_fields', {
        get() {
            return this.constructor.fields;
        },
    });

    // Set pk field
    const pkFieldParameters = { value: ModelUtils.getPkField(cls), writable: true };
    Object.defineProperty(cls, 'pkField', pkFieldParameters);
    Object.defineProperty(cls.prototype, '_pkField', {
        get() {
            return this.constructor.pkField;
        },
    });

    // Set pk field name
    Object.defineProperty(cls, 'pkFieldName', { value: cls.pkField?.name || null, writable: true });
    Object.defineProperty(cls.prototype, '_pkFieldName', {
        get() {
            return this.constructor.pkFieldName;
        },
    });

    // Set view field
    const viewFieldParameters = { value: ModelUtils.getViewField(cls), writable: true };
    Object.defineProperty(cls, 'viewField', viewFieldParameters);
    Object.defineProperty(cls.prototype, '_viewField', {
        get() {
            return this.constructor.viewField;
        },
    });

    // Set translate model name
    if (!cls.translateModel) {
        cls.translateModel = name;
    }

    // Set fields descriptors
    for (let [fieldName, field] of fields) {
        Object.defineProperty(cls.prototype, fieldName, field.toDescriptor());
    }

    return cls;
}

/**
 * Data that goes to/from api
 * @typedef {Object} InnerData
 */

/**
 * Data stored in sandbox store
 * @typedef {Object} RepresentData
 */

/**
 * Class of Base Model.
 * @property {string} _name - Model name
 * @property {Map<string, BaseField>} _fields
 * @property {BaseField} _pkField
 * @property {BaseField} _viewField
 * @property {string|null} _pkFieldName
 */
export class Model {
    /** @type {Array<BaseField>} */
    static declaredFields = [];
    /** @type {Object<string, string[]>} */
    static fieldsGroups = null;
    /** @type {string|null} */
    static viewFieldName = null;
    /** @type {Array<string>|null} */
    static nonBulkMethods = null;
    /** @type {string|null} */
    static translateModel = null;
    /** @type {Map<string, BaseField>} */
    static fields = new Map();

    /**
     * @param {InnerData=} data
     * @param {QuerySet=} queryset
     * @param {Model=} parentInstance
     */
    constructor(data = null, queryset = null, parentInstance = null) {
        if (!data) {
            data = parentInstance?._data || this.constructor.getInitialData();
        }
        if (!queryset && parentInstance) {
            queryset = parentInstance._queryset;
        }
        this._parentInstance = parentInstance;
        this._data = data;
        this._queryset = queryset;
    }

    /**
     * @param {Record<string, unknown>} representData
     * @return {Record<string, unknown>}
     */
    static representToInner(representData) {
        const data = {};
        for (const field of this.fields.values()) {
            const value = field.toInner(representData);
            if (field.required || value !== undefined) {
                data[field.name] = value;
            }
        }
        return data;
    }

    /**
     * @param {Object=} providedData
     * @return {InnerData}
     */
    static getInitialData(providedData = {}) {
        const data = mergeDeep({}, providedData);
        for (const [name, field] of this.fields) {
            if (!hasOwnProp(data, name)) {
                data[name] = field.getInitialValue();
            }
        }
        return data;
    }

    /**
     * @property @property {Array<string>} [fieldsNames]
     * @return {Record<string, unknown>}
     */
    _getInnerData(fieldsNames = null) {
        let selectedFields = Array.from(this._fields.values());
        if (fieldsNames) {
            selectedFields = selectedFields.filter((f) => fieldsNames.includes(f.name));
        }
        const data = {};
        for (const field of selectedFields) {
            const value = this._data[field.name];
            if (field.required || value !== undefined) {
                data[field.name] = value;
            }
        }
        return data;
    }

    /**
     * @return {Record<string, unknown>}
     */
    _getRepresentData() {
        const data = {};
        for (const [name, field] of this._fields) {
            data[name] = field.toRepresent(this._data);
        }
        return data;
    }

    /**
     * @param {RepresentData} data
     * @throws {ModelValidationError}
     */
    _validateAndSetData(data) {
        // Validate data
        /** @type {FieldValidationErrorInfo[]} */
        const errors = [];
        for (const field of this._fields.values()) {
            try {
                field.validateValue(data);
            } catch (e) {
                errors.push({ field, message: e.message });
            }
        }
        if (errors.length) throw new ModelValidationError(errors);

        // Set validated data
        const newData = {};
        for (const field of this._fields.values()) {
            newData[field.name] = field.toInner(data);
        }
        this._data = newData;
    }

    _setFieldValue(fieldName, value, isRaw = false) {
        if (isRaw) {
            this._data[fieldName] = value;
        } else {
            this[fieldName] = value;
        }
    }

    /**
     * Method, that returns instance's value of PK field.
     */
    getPkValue() {
        return this._parentInstance?.getPkValue() || this._data[this._pkFieldName];
    }

    /**
     * Method, that returns instance's value of view field.
     */
    getViewFieldValue(defaultValue = '') {
        if (this._viewField) {
            return this[this._viewField.name];
        }
        return defaultValue;
    }

    /**
     * Returns value of view field as safe escaped string or undefined if model has no view field.
     * @param {boolean} escapeResult
     * @return {string|undefined}
     */
    getViewFieldString(escapeResult = true) {
        if (this._viewField) {
            let value = this[this._viewField.name];
            if (value instanceof Model) {
                return value.getViewFieldString();
            }
            if (value === null || value === undefined) {
                return;
            }
            if (typeof value === 'object') {
                value = value.name || value.title;
            }
            const strValue = this._viewField.translateValue(String(value));

            return escapeResult ? escapeHtml(strValue) : strValue;
        }
    }

    /**
     * @param {HttpMethod} method
     * @returns {boolean}
     */
    static shouldUseBulk(method) {
        if (!this.nonBulkMethods) {
            return true;
        }
        return !this.nonBulkMethods.includes(method);
    }

    /**
     * Method to update model data
     * @param {string=} method
     * @param {null | string[]} fields
     * @return {Promise.<Model>}
     */
    async update(method, fields = null) {
        return (await this._queryset.update(this, [this], method, fields))[0];
    }

    /**
     * Method, that sends api request to delete Model instance.
     *
     * @returns {Promise}
     */
    async delete(purge = false) {
        return (await this._queryset.delete([this], purge))[0];
    }

    /**
     * Method, that creates new Model instance.
     * @param {string} method - Http method
     * @return {Promise<Model>}
     */
    async create(method = 'post') {
        return this._queryset.create(this, method);
    }

    /**
     * Method that saves current model instance
     * @param {string=} method - Http method
     * @return {Promise<Model>}
     */
    async save(method) {
        if (!this.getPkValue()) {
            return this.create(method);
        }
        return this.update(method);
    }

    /**
     * Checks if this instance's data is equal to data of the provided instance
     * @param {Model|Object} other
     * @return {boolean}
     */
    isEqual(other) {
        if (this === other) return true;
        let data = other;
        if (other instanceof Model) {
            if (other.constructor !== this.constructor) return false;
            data = other._data;
        }
        for (const field of this._fields.values()) {
            if (!field.isSameValues(this._data, data)) return false;
        }
        return true;
    }

    /**
     * @param {Object} data
     * @return {ModelValidationError|undefined}
     */
    parseModelError(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return;
        }
        const errors = [];
        for (let [fieldName, item] of Object.entries(data)) {
            const field = this._fields.get(fieldName);
            if (field) {
                const message = field.parseFieldError(item, this._data);
                if (message) {
                    errors.push({ field, message });
                }
            }
        }
        if (errors.length > 0) {
            return new ModelValidationError(errors);
        }
    }
}
