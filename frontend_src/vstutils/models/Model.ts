import type { APIResponse } from '../api';
import type { Field } from '../fields/base';
import type { QuerySet } from '../querySet';
import type { HttpMethod, InnerData, RepresentData } from '@/vstutils/utils';
import type { MODEL_MODES } from '@/vstutils/schema';
import {
    deepEqual,
    escapeHtml,
    hasOwnProp,
    mergeDeep,
    emptyInnerData,
    emptyRepresentData,
} from '@/vstutils/utils';
import { createModelSandbox, type ModelSandbox } from './sandbox';
import { ModelValidationError } from './errors';
import { getAdditionalPropertiesField, hasAdditionalProperties } from '../additionalProperties';

export interface FieldsGroup {
    title: string;
    fields: (string | Field)[];
    wrapperClasses?: string;
}

type RawFieldsGroups = Record<string, string[]>;

export interface FieldsInstancesGroup extends FieldsGroup {
    fields: Field[];
}

export interface Model {
    _name: string;
    _response?: APIResponse<InnerData>;
    __notFound?: true;

    _fields: Map<string, Field>;
    _additionalProperties: Field | undefined;
    _pkField?: Field;
    _viewField?: Field;
    _queryset?: QuerySet;
    _parentInstance?: Model;

    _data: InnerData;
    readonly sandbox: ModelSandbox;

    getPkValue(): string | number | undefined | null;
    getViewFieldString(escapeResult?: boolean): string | undefined;
    getViewFieldValue(defaultValue?: unknown): unknown;
    clone(options?: { data?: InnerData }): Model;

    _getInnerData(fieldsNames?: string[]): InnerData;
    _getRepresentData(): RepresentData;
    _validateAndSetData(data?: RepresentData): void;

    shouldUseBulk(method: HttpMethod): boolean;
    isEqual(model: Model): boolean;
    parseModelError(data: unknown): ModelValidationError | undefined;

    create(method?: HttpMethod): Promise<Model>;
    update(method?: HttpMethod, fields?: string[], ignoreEtag?: boolean): Promise<Model>;
    delete(purge?: boolean): Promise<APIResponse<unknown>>;
}

export type ModelConstructor = typeof BaseModel;

export class BaseModel implements Model {
    static fieldsGroups?: RawFieldsGroups | ((args: { data: RepresentData }) => FieldsGroup[]);
    static nonBulkMethods: HttpMethod[] | null = null;
    static translateModel: string | null = null;
    static fields = new Map<string, Field>();
    static pkField?: Field;
    static viewField?: Field;
    static hideNotRequired?: boolean;
    static additionalProperties?: Field | undefined;
    static additionalPropertiesGroup = '';
    static displayMode: typeof MODEL_MODES[number] = 'DEFAULT';
    static visibilityDataFieldName?: string;

    _queryset?: QuerySet;
    _parentInstance?: Model;

    protected __data: InnerData;
    protected _sandbox?: ModelSandbox;

    _response?: APIResponse<InnerData>;
    __notFound?: true;

    constructor(data?: InnerData, queryset?: QuerySet | null, parentInstance?: Model) {
        if (!data) {
            data = parentInstance?._getInnerData() ?? emptyInnerData();
        }
        if (!queryset && parentInstance) {
            queryset = parentInstance._queryset;
        }
        this._parentInstance = parentInstance;
        this.__data = data;
        this._queryset = queryset ?? undefined;
    }

    protected get _c() {
        return this.constructor as ModelConstructor;
    }

    get _name() {
        return this._c.name;
    }

    get _fields() {
        return this._c.fields;
    }

    get _additionalProperties() {
        return this._c.additionalProperties;
    }

    get _pkField() {
        return this._c.pkField;
    }

    get _viewField() {
        return this._c.viewField;
    }

    get _data() {
        return this.__data;
    }

    set _data(data: InnerData) {
        this.__data = data;
        this.sandbox.reset();
    }

    get sandbox() {
        if (this._sandbox) {
            return this._sandbox;
        }
        this._sandbox = createModelSandbox(this);
        return this._sandbox;
    }

    static fromRepresentData(data: RepresentData) {
        return new this(this.representToInner(data));
    }

    static getFieldsGroups({ data }: { data: RepresentData }): FieldsGroup[] {
        const additionalProperties = Object.keys(data).filter((key) => !this.fields.has(key));
        const additionalPropertiesGroup = this.additionalPropertiesGroup;
        if (this.fieldsGroups) {
            if (typeof this.fieldsGroups === 'function') {
                return this.fieldsGroups({ data });
            }
            let additionalPropertiesAreGrouped = false;
            const groups = Object.entries(this.fieldsGroups).map(([title, fields]) => {
                if (title === additionalPropertiesGroup) {
                    fields.push(...additionalProperties);
                    additionalPropertiesAreGrouped = true;
                }
                return { title, fields };
            });
            if (!additionalPropertiesAreGrouped) {
                groups.push({ title: additionalPropertiesGroup, fields: additionalProperties });
            }
            return groups;
        }
        if (additionalPropertiesGroup === '') {
            return [{ title: '', fields: [...Array.from(this.fields.keys()), ...additionalProperties] }];
        } else {
            return [
                { title: '', fields: Array.from(this.fields.keys()) },
                { title: additionalPropertiesGroup, fields: additionalProperties },
            ];
        }
    }

    static representToInner(representData: RepresentData): InnerData {
        const data = emptyInnerData();
        for (const field of this.fields.values()) {
            const value = field.toInner(representData);
            if (field.required || value !== undefined) {
                data[field.name] = value;
            }
        }
        if (hasAdditionalProperties(this)) {
            for (const key of Object.keys(representData)) {
                if (!this.fields.has(key)) {
                    const field = getAdditionalPropertiesField(this, { name: key, title: undefined });
                    data[key] = field.toInner(representData);
                }
            }
        }
        return data;
    }

    static innerToRepresent(data: InnerData): RepresentData {
        const representData = emptyRepresentData();
        for (const [name, field] of this.fields) {
            representData[name] = field.toRepresent(data);
        }
        for (const key of Object.keys(data)) {
            if (this.fields.has(key)) {
                continue;
            }
            if (hasAdditionalProperties(this)) {
                const field = getAdditionalPropertiesField(this, { name: key, title: undefined });
                representData[key] = field.toRepresent(data);
            } else {
                // NOTE: `false` value of additionalProperties is not supported yet
                // and interpreted the same as `true`
                representData[key] = data[key];
            }
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
        return this.sandbox.value;
    }

    /**
     * @throws {ModelValidationError}
     */
    _validateAndSetData(data?: RepresentData) {
        if (data) {
            this._data = this._c.fromRepresentData(data).sandbox.validate();
            return;
        }
        this.__data = this.sandbox.validate();
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
            if (value instanceof BaseModel) {
                return value.getViewFieldString();
            }
            if (value && typeof value === 'object') {
                value = ('name' in value && value.name) || ('title' in value && value.title) || undefined;
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

    shouldUseBulk(method: HttpMethod) {
        return this._c.shouldUseBulk(method);
    }

    async update(method?: HttpMethod, fields?: string[], ignoreEtag?: boolean): Promise<Model> {
        return (await this._queryset!.update(this, [this], method, fields, ignoreEtag))[0];
    }

    async delete(purge = false) {
        const responses = await this._queryset!.delete([this], purge);
        return responses[0];
    }

    async create(method: HttpMethod = 'post'): Promise<Model> {
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
        if (!(other instanceof BaseModel)) return false;
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
        const instance = new this._c(data, this._queryset, this._parentInstance);
        return instance as this;
    }

    static getFieldsVisibilityData(data: RepresentData): Record<string, boolean | undefined> | undefined {
        if (!this.visibilityDataFieldName) {
            return undefined;
        }
        return data[this.visibilityDataFieldName] as Record<string, boolean | undefined> | undefined;
    }
}
