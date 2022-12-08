import type { ComponentOptions } from 'vue';

import type { Field, FieldOptions, FieldXOptions } from '@/vstutils/fields/base';
import { BaseField } from '@/vstutils/fields/base';
import type { Model } from '@/vstutils/models';
import type { QuerySet } from '@/vstutils/querySet';
import { onAppAfterInit } from '@/vstutils/signals';

import DynamicFieldMixin from './DynamicFieldMixin.vue';

import type { FieldDefinition } from '@/vstutils/fields/FieldsResolver';
import type { IView, PageView, View } from '@/vstutils/views';
import { RequestTypes } from '@/vstutils/utils';

interface DynamicFieldXOptions extends FieldXOptions {
    source_view?: string;
    field?: string | string[];
    types?: Record<string, FieldDefinition>;
    choices?: Record<string, unknown[]>;
    callback?: (data: Record<string, unknown>) => FieldDefinition | undefined;
}

export class DynamicField
    extends BaseField<unknown, unknown, DynamicFieldXOptions>
    implements Field<unknown, unknown, DynamicFieldXOptions>
{
    types: Record<string, Field> | null = null;
    usedOnViews = new Set<string>();
    sourceView?: PageView | number;

    constructor(options: FieldOptions<DynamicFieldXOptions, unknown>) {
        super(options);

        onAppAfterInit(() => {
            this.resolveTypes();
            this.checkSourceView();
        });
    }

    protected checkSourceView() {
        if (!this.props.source_view) {
            return;
        }
        if (this.props.source_view.match(/^<<parent>>(.<<parent>>)*$/)) {
            this.sourceView = (this.props.source_view.split('.').length + 1) * -1;
            return;
        }
        const view = this.app.views.get(this.props.source_view);
        if (!view) {
            this.error(`Invalid source_view path ${this.props.source_view}`);
        }
        if (!view.isDetailPage()) {
            this.error('Only detail view is supported as source_view');
        }
        this.sourceView = view;
    }

    resolveTypes() {
        if (this.props.types) {
            const types: Record<string, Field> = {};
            for (const [value, fieldDefinition] of Object.entries(this.props.types)) {
                const field = this.app.fieldsResolver.resolveField(fieldDefinition, this.name);
                if (this.required) {
                    field.required = this.required;
                }
                if (!field.title) {
                    field.title = this.title;
                }
                types[value] = field;
            }
            this.types = types;
            for (const path of this.usedOnViews) {
                for (const field of Object.values(this.types)) {
                    field.prepareFieldForView(path);
                }
            }
        }
    }

    prepareFieldForView(path: string) {
        this.usedOnViews.add(path);
    }

    static get mixins(): ComponentOptions<Vue>[] {
        return [DynamicFieldMixin as ComponentOptions<Vue>];
    }

    toInner(data = {}) {
        return this.getRealField(data).toInner(data);
    }
    toRepresent(data = {}) {
        return this.getRealField(data).toRepresent(data);
    }
    validateValue(data: Record<string, unknown>) {
        return this.getRealField(data).validateValue(data);
    }
    afterInstancesFetched(instances: Model[], queryset: QuerySet): Promise<void> {
        const fields = new Map<Field, Model[]>();

        for (const instance of instances) {
            const realField = this.getRealField(instance._data);
            const sameField = Array.from(fields.keys()).find((field) => realField.isEqual(field));

            if (sameField) {
                fields.get(sameField)!.push(instance);
            } else {
                fields.set(realField, [instance]);
            }
        }

        return Promise.all(
            Array.from(fields.entries()).map(([field, instances]) =>
                field.afterInstancesFetched(instances, queryset),
            ),
        ) as unknown as Promise<void>;
    }
    /**
     * Method, that returns Array with names of parent fields -
     * fields, from which values, current field's format depends on.
     */
    _getParentFields(): string[] {
        const p_f = this.props.field ?? [];

        if (Array.isArray(p_f)) {
            return p_f;
        }

        return [p_f];
    }
    /**
     * Method, that returns Object, that stores arrays with choices values.
     */
    _getParentChoices(): Record<string, unknown[]> {
        return this.props.choices ?? {};
    }

    protected resolveParentViewData(): Record<string, unknown> | undefined {
        if (this.sourceView === undefined) {
            return;
        }

        let view: PageView;

        if (typeof this.sourceView === 'number') {
            const item = this.app.store.viewItems.at(this.sourceView);
            if (item) {
                if (!item.view.isDetailPage()) {
                    this.warn('Only detail view is supported as source_view');
                    return;
                }
                view = item.view;
            } else {
                // viewItems items may not still be initialized
                return;
            }
        } else {
            view = this.sourceView;
        }

        const state = view.getSavedState();
        if (state?.instance) {
            return state.instance._getRepresentData();
        }

        return;
    }

    _getParentValues(data: Record<string, unknown> = {}): Record<string, unknown> {
        const parentData = this.resolveParentViewData() ?? data;

        const parentFields = this._getParentFields();
        const parentValues: Record<string, unknown> = {};

        for (const name of parentFields) {
            parentValues[name] = parentData[name];
        }

        return parentValues;
    }

    getRealField(data: Record<string, unknown> = {}): Field {
        const parentValues = this._getParentValues(data);

        const field =
            this._getFromTypes(parentValues) ??
            this._getFromCallback(parentValues) ??
            this._getFromChoices(parentValues) ??
            this._getFromValue(parentValues) ??
            this._getDefault();

        field.prepareFieldForView((this.app.router!.currentRoute.meta!.view as View).path);

        if (!field.model && this.model) {
            field.model = this.model;
        }

        return field;
    }

    parseFieldError(data: Record<string, unknown>, instanceData: Record<string, unknown> = {}) {
        return this.getRealField(instanceData).parseFieldError(data, instanceData);
    }

    _getFromValue(data: Record<string, unknown>) {
        if (typeof this.props.field === 'string') {
            const value = data[this.props.field] as string | Record<string, unknown> | undefined | null;
            if (value) {
                try {
                    return this.app.fieldsResolver.resolveField(value, this.name);
                } catch {
                    return undefined;
                }
            }
        }
        return undefined;
    }

    _getFromTypes(parentValues: Record<string, unknown>): Field | undefined {
        if (this.types) {
            for (const key of Object.values(parentValues)) {
                const field = this.types[key as string] as Field | undefined;
                if (field) return field;
            }
        }
        return;
    }

    _getFromChoices(parentValues: Record<string, unknown>): Field | undefined {
        const parentChoices = this._getParentChoices();
        for (const key of Object.keys(parentValues)) {
            const item = parentChoices[parentValues[key] as string];
            if (Array.isArray(item)) {
                const isBoolean = item.some((val) => typeof val === 'boolean');
                return this.app.fieldsResolver.resolveField(
                    isBoolean ? { type: 'boolean' } : { format: 'choices', enum: item },
                    this.name,
                );
            }
        }
        return;
    }

    _getFromCallback(parentValues: Record<string, unknown>): Field | undefined {
        if (this.props.callback) {
            const callbackResult = this.props.callback(parentValues);
            if (callbackResult) {
                return this.app.fieldsResolver.resolveField(callbackResult, this.name);
            }
        }
        return;
    }

    _getDefault(): Field {
        return this.app.fieldsResolver.resolveField('string', this.name);
    }
}
