import type { APIResponse } from '../api';
import type { Field } from '../fields/base';
import type { QuerySet } from '../querySet';
import type { HttpMethod, InnerData, RepresentData } from '@/vstutils/utils';
import {
    deepEqual,
    escapeHtml,
    hasOwnProp,
    mergeDeep,
    emptyInnerData,
    emptyRepresentData,
} from '@/vstutils/utils';
import type { FieldValidationErrorInfo } from './errors';
import { ModelValidationError } from './errors';

export type ModelConstructor<T extends typeof Model = typeof Model> = new (
    data?: InnerData,
    queryset?: QuerySet | null,
    parentInstance?: Model,
) => InstanceType<T>;

export class Model {
    static fieldsGroups: Record<string, string[]> | null = null;
    static nonBulkMethods: HttpMethod[] | null = null;
    static translateModel: string | null = null;
    static fields = new Map<string, Field>();
    static pkField?: Field;
    static viewField?: Field;

    _queryset?: QuerySet;
    _parentInstance?: Model;

    _data: InnerData;

    _response?: APIResponse<InnerData>;
    __notFound?: true;

    constructor(data?: InnerData, queryset?: QuerySet | null, parentInstance?: Model) {
        if (!data) {
            data = parentInstance?._data ?? (this.constructor as typeof Model).getInitialData();
        }
        if (!queryset && parentInstance) {
            queryset = parentInstance._queryset;
        }
        this._parentInstance = parentInstance;
        this._data = data;
        this._queryset = queryset ?? undefined;
    }

    get _fields() {
        return (this.constructor as typeof Model).fields;
    }

    get _pkField() {
        return (this.constructor as typeof Model).pkField;
    }

    get _viewField() {
        return (this.constructor as typeof Model).viewField;
    }

    static fromRepresentData(data: RepresentData) {
        const instance = new this();
        instance._validateAndSetData(data);
        return instance;
    }

    static representToInner(representData: RepresentData): InnerData {
        const data = emptyInnerData();
        for (const field of this.fields.values()) {
            const value = field.toInner(representData);
            if (field.required || value !== undefined) {
                data[field.name] = value;
            }
        }
        return data;
    }

    static innerToRepresent(data: InnerData): RepresentData {
        const representData = emptyRepresentData();
        for (const [name, field] of this.fields) {
            representData[name] = field.toRepresent(data);
        }
        return representData;
    }

    static getInitialData(providedData: InnerData = emptyInnerData()): InnerData {
        const data = mergeDeep({}, providedData) as InnerData;
        for (const [name, field] of this.fields) {
            if (!hasOwnProp(data, name)) {
                data[name] = field.getInitialValue();
            }
        }
        return data;
    }

    static get writableFields() {
        return Array.from(this.fields.values()).filter((field) => !field.readOnly);
    }

    _getInnerData(fieldsNames?: string[]): InnerData {
        let selectedFields = Array.from(this._fields.values());
        if (fieldsNames) {
            selectedFields = selectedFields.filter((f) => fieldsNames.includes(f.name));
        }
        const data = emptyInnerData();
        for (const field of selectedFields) {
            const value = this._data[field.name];
            if (field.required || value !== undefined) {
                data[field.name] = value;
            }
        }
        return data;
    }

    _getRepresentData(): RepresentData {
        const data = emptyRepresentData();
        for (const [name, field] of this._fields) {
            data[name] = field.toRepresent(this._data);
        }
        return data;
    }

    /**
     * @param {RepresentData} data
     * @throws {ModelValidationError}
     */
    _validateAndSetData(data: RepresentData) {
        // Validate data
        const errors: FieldValidationErrorInfo[] = [];
        for (const field of this._fields.values()) {
            try {
                field.validateValue(data);
            } catch (e) {
                errors.push({ field, message: (e as Error).message });
            }
        }
        if (errors.length) throw new ModelValidationError(errors);

        // Set validated data
        const newData = emptyInnerData();
        for (const field of this._fields.values()) {
            newData[field.name] = field.toInner(data);
        }
        this._data = newData;
    }

    _setFieldValue(fieldName: string, value: unknown, isRaw = false) {
        if (isRaw) {
            this._data[fieldName] = value;
        } else {
            this._data[fieldName] = this._fields.get(fieldName)!.toDescriptor().set.call(this, value);
        }
    }

    getRepresentValue(fieldName: string) {
        const field = this._fields.get(fieldName);
        if (!field) {
            throw new Error(`Field "${fieldName}" is not found in model "${this.constructor.name}"`);
        }
        return field.toRepresent(this._data);
    }

    getInnerValue(fieldName: string) {
        const field = this._fields.get(fieldName);
        if (!field) {
            throw new Error(`Field "${fieldName}" is not found in model "${this.constructor.name}"`);
        }
        return field.getValue(this._data);
    }

    getPkValue(): string | number | undefined | null {
        if (this._parentInstance) {
            const parentPk = this._parentInstance.getPkValue();
            if (parentPk) {
                return parentPk;
            }
        }
        if (this._pkField) {
            return this.getInnerValue(this._pkField.name) as string | number | undefined | null;
        }
        return;
    }

    /**
     * Method, that returns instance's represent value of view field.
     */
    getViewFieldValue(defaultValue: unknown = '') {
        if (this._viewField) {
            return this.getRepresentValue(this._viewField.name);
        }
        return defaultValue;
    }

    /**
     * Returns value of view field as safe escaped string or undefined if model has no view field.
     */
    getViewFieldString(escapeResult = true): string | undefined {
        if (this._viewField) {
            let value = this.getRepresentValue(this._viewField.name);
            if (value instanceof Model) {
                return value.getViewFieldString();
            }
            if (value && typeof value === 'object') {
                value = ('name' in value && value.name) || ('title' in value && value.title);
            }
            if (value === null || value === undefined) {
                return '';
            }
            const strValue = this._viewField.translateValue(String(value)) as string;

            return escapeResult ? escapeHtml(strValue) : strValue;
        }
        return;
    }

    static shouldUseBulk(method: HttpMethod) {
        if (!this.nonBulkMethods) {
            return true;
        }
        return !this.nonBulkMethods.includes(method);
    }

    async update(method?: HttpMethod, fields?: string[]) {
        return (await this._queryset!.update(this, [this], method, fields))[0];
    }

    async delete(purge = false) {
        return (await this._queryset!.delete([this], purge))[0];
    }

    async create(method: HttpMethod = 'post') {
        return this._queryset!.create(this, method);
    }

    async save(method?: HttpMethod) {
        if (!this.getPkValue()) {
            return this.create(method);
        }
        return this.update(method);
    }

    /**
     * Checks if this instance's data is equal to data of the provided instance
     */
    isEqual(other: Model) {
        if (this === other) return true;
        if (!(other instanceof Model)) return false;
        if (other.constructor !== this.constructor) return false;
        for (const field of this._fields.values()) {
            if (!deepEqual(field.getValue(this._data), field.getValue(other._data))) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param {Object} data
     * @return {ModelValidationError|undefined}
     */
    parseModelError(data: unknown) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return;
        }
        const errors = [];
        for (const [fieldName, item] of Object.entries(data)) {
            const field = this._fields.get(fieldName);
            if (field) {
                const message = field.parseFieldError(item, this._data);
                if (message) {
                    errors.push({ field, message: message as string });
                }
            }
        }
        if (errors.length > 0) {
            return new ModelValidationError(errors);
        }
        return;
    }

    clone({ data }: { data?: InnerData } = {}): this {
        if (!data) {
            data = mergeDeep({}, this._data) as InnerData;
        }
        const instance = new (this.constructor as ModelConstructor)(
            data,
            this._queryset,
            this._parentInstance,
        );
        return instance as this;
    }
}
