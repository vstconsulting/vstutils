import { BaseField } from './base';
import { ENUM_TYPES, hasOwnProp, SCHEMA_DATA_TYPE, SCHEMA_DATA_TYPE_VALUES } from '../utils';

const X_FORMAT = 'x-format';

/**
 * Helps with creation of fields, $ref can be used to reference schema objects
 */
export class FieldsResolver {
    static DEFAULT_FIELD_KEY = Symbol('defaultFieldClassKey');

    constructor(schema) {
        this._schema = schema;
        this._types = new Map(Object.values(SCHEMA_DATA_TYPE).map((type) => [type, new Map()]));
    }

    /**
     * @param {string} pointer
     * @return {*}
     */
    _resolveJsonPointer(pointer) {
        return pointer
            .split('/')
            .slice(1)
            .reduce((obj, fragment) => obj[fragment], this._schema);
    }

    /**
     * @param {string} type
     * @param {string} format
     * @param {Function} fieldClass
     */
    registerField(type, format, fieldClass) {
        const typeMap = this._types.get(type);
        if (!typeMap) {
            throw new Error(`Unknown data type: ${type}`);
        }
        typeMap.set(format, fieldClass);
    }

    registerDefaultForType(type, fieldClass) {
        this.registerField(type, this.constructor.DEFAULT_FIELD_KEY, fieldClass);
    }

    /**
     * Method that creates field instance by schema object or format. If schema object contain reference ($ref),
     * it will be resolved using app.
     *
     * Name must be provided if string mode is used or obj has no name.
     *
     * @param {string|object} obj
     * @param {string} [name]
     * @return {Field}
     */
    resolveField(obj, name = undefined) {
        if (obj instanceof BaseField) {
            return obj;
        }

        if (!obj) {
            throw new Error('Obj is required');
        }

        if (obj.$ref) {
            Object.assign(obj, this._resolveJsonPointer(obj.$ref));
        }

        if (typeof obj === 'string') {
            obj = this._getByString(obj);
        }

        if (name) {
            obj.name = name;
        } else if (!hasOwnProp(obj, 'name')) {
            throw new Error(`Name for field "${JSON.stringify(obj)}" is not provided`);
        }

        if (!obj.format) {
            obj.format = obj[X_FORMAT] || obj?.items?.[X_FORMAT];
        }

        if (obj.format && !obj.type) {
            this._guessTypeByFormat(obj);
        }

        this._handleSpecialCase(obj);

        const typeMap = this._types.get(obj.type);
        if (!typeMap) {
            console.warn(`Unknown type: ${obj.type}`);
            return this._defaultField(obj);
        }

        if (obj.format) {
            const fieldClass = typeMap.get(obj.format);
            if (fieldClass) {
                return new fieldClass(obj);
            }
            console.warn(`Unknown format "${obj.format}" for type "${obj.type}"`);
        }

        const defaultForType = typeMap.get(this.constructor.DEFAULT_FIELD_KEY);
        if (defaultForType) {
            return new defaultForType(obj);
        }
        console.warn(`Type "${obj.type}" has no default field class`);
        return this._defaultField(obj);
    }

    _handleSpecialCase(obj) {
        if (!obj.format && obj.enum && ENUM_TYPES.includes(obj.type)) {
            obj.format = 'choices';
        }
    }

    _getByString(str) {
        if (SCHEMA_DATA_TYPE_VALUES.includes(str)) {
            return { type: str };
        }
        for (const type of SCHEMA_DATA_TYPE_VALUES) {
            const field = this._types.get(type).get(str);
            if (field) {
                return { type, format: str };
            }
        }
        console.warn(`Can not detect field from string ${str}, string field will be used`);
        return { type: SCHEMA_DATA_TYPE.string };
    }

    _guessTypeByFormat(obj) {
        if (SCHEMA_DATA_TYPE_VALUES.includes(obj.format)) {
            obj.type = obj.format;
            delete obj.format;
        }
        for (const type of SCHEMA_DATA_TYPE_VALUES) {
            if (this._types.get(type).has(obj.format)) {
                obj.type = type;
                break;
            }
        }
    }

    _defaultField(obj) {
        return new BaseField(obj);
    }

    *allFieldsClasses() {
        for (const typeMap of this._types.values()) {
            yield* typeMap.values();
        }
    }
}
