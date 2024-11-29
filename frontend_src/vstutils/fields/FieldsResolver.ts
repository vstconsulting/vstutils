import type { Field, FieldOptions, FieldXOptions } from './base';
import { BaseField } from './base';
import { ENUM_TYPES, hasOwnProp, SCHEMA_DATA_TYPE, SCHEMA_DATA_TYPE_VALUES } from '../utils';
import type { AppSchema } from '../schema';
import type { ParameterType } from 'swagger-schema-official';

const X_FORMAT = 'x-format';

function isFieldInstance(obj: unknown): obj is Field {
    return obj instanceof BaseField;
}

export type FieldDefinition = Field | string | Partial<FieldOptions<FieldXOptions, unknown>>;

/**
 * Helps with creation of fields, $ref can be used to reference schema objects
 */
export class FieldsResolver {
    static readonly DEFAULT_FIELD_KEY: unique symbol = Symbol('defaultFieldClassKey');

    _schema: AppSchema;
    _types = new Map<
        ParameterType,
        Map<string | (typeof FieldsResolver)['DEFAULT_FIELD_KEY'], new (options: any) => Field>
    >([
        ['string', new Map()],
        ['number', new Map()],
        ['integer', new Map()],
        ['boolean', new Map()],
        ['array', new Map()],
        ['object', new Map()],
        ['file', new Map()],
    ]);

    constructor(schema: AppSchema) {
        this._schema = schema;
    }

    _resolveJsonPointer(pointer: string): unknown {
        return pointer
            .split('/')
            .slice(1)

            .reduce((obj, fragment) => obj[fragment], this._schema);
    }

    registerField(
        type: ParameterType,
        format: string | (typeof FieldsResolver)['DEFAULT_FIELD_KEY'],
        fieldClass: new (options: any) => Field,
    ) {
        const typeMap = this._types.get(type);
        if (!typeMap) {
            throw new Error(`Unknown data type: ${type}`);
        }
        typeMap.set(format, fieldClass);
    }

    registerDefaultForType(type: ParameterType, fieldClass: new (options: any) => Field) {
        this.registerField(type, FieldsResolver.DEFAULT_FIELD_KEY, fieldClass);
    }

    /**
     * Method that creates field instance by schema object or format. If schema object contain reference ($ref),
     * it will be resolved using app.
     *
     * Name must be provided if string mode is used or obj has no name.
     */
    resolveField(obj: FieldDefinition, name?: string): Field {
        if (!obj) {
            throw new Error('Obj is required');
        }

        if (isFieldInstance(obj)) {
            return obj;
        }

        if (typeof obj === 'string') {
            obj = this._getByString(obj);
        } else if ('$ref' in obj) {
            Object.assign(obj, this._resolveJsonPointer(obj.$ref!));
        }

        if (name) {
            obj.name = name;
        } else if (!hasOwnProp(obj, 'name')) {
            throw new Error(`Name for field "${JSON.stringify(obj)}" is not provided`);
        }

        if (!obj.format) {
            obj.format = obj[X_FORMAT] || obj.items?.[X_FORMAT];
        }

        if (obj.format && !obj.type) {
            this._guessTypeByFormat(obj);
        }

        this._handleSpecialCase(obj);

        const typeMap = this._types.get(obj.type!);
        if (!typeMap) {
            console.warn(`Unknown type: ${obj.type}`);
            return this._defaultField(obj);
        }

        if (obj.format) {
            const fieldClass = typeMap.get(obj.format);
            if (fieldClass) {
                return new fieldClass(obj);
            }
            console.warn(`Unknown format "${obj.format}" for type "${obj.type!}"`);
        }

        const defaultForType = typeMap.get(FieldsResolver.DEFAULT_FIELD_KEY);
        if (defaultForType) {
            return new defaultForType(obj);
        }
        console.warn(`Type "${obj.type!}" has no default field class`);
        return this._defaultField(obj);
    }

    _handleSpecialCase(obj: { type?: ParameterType; format?: string; enum?: unknown[] }) {
        if (!obj.format && obj.enum && obj.type && ENUM_TYPES.includes(obj.type)) {
            obj.format = 'choices';
        }
    }

    _getByString(str: string): { type: ParameterType; format?: string } {
        if (SCHEMA_DATA_TYPE_VALUES.includes(str as ParameterType)) {
            return { type: str as ParameterType };
        }
        for (const type of SCHEMA_DATA_TYPE_VALUES) {
            const field = this._types.get(type)?.get(str);
            if (field) {
                return { type, format: str };
            }
        }
        console.warn(`Can not detect field from string ${str}, string field will be used`);
        return { type: SCHEMA_DATA_TYPE.string };
    }

    _guessTypeByFormat(obj: { type?: string; format?: string }) {
        if (SCHEMA_DATA_TYPE_VALUES.includes(obj.format as ParameterType)) {
            obj.type = obj.format;
            delete obj.format;
        }
        for (const type of SCHEMA_DATA_TYPE_VALUES) {
            if (this._types.get(type)?.has(obj.format!)) {
                obj.type = type;
                break;
            }
        }
    }

    _defaultField(obj: unknown) {
        return new BaseField(obj as FieldOptions<FieldXOptions, unknown>);
    }

    *allFieldsClasses() {
        for (const typeMap of this._types.values()) {
            yield* typeMap.values();
        }
    }
}
