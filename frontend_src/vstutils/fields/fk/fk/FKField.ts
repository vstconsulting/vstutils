import { BaseField } from '@/vstutils/fields/base';
import { onAppBeforeInit } from '@/vstutils/signals';
import { i18n } from '@/vstutils/translation';
import type { RepresentData } from '@/vstutils/utils';
import { formatPath, getApp, getDependenceValueAsString, RequestTypes } from '@/vstutils/utils';

import FKFieldMixin from './FKFieldMixin';
import { FKArrayFieldMixin } from './array';

import type { Component, ComponentOptions } from 'vue';
import type { ModelDefinition } from '@/vstutils/AppConfiguration';
import type { FieldOptions, FieldXOptions } from '@/vstutils/fields/base';
import type { PageView, ViewStore } from '@/vstutils/views';
import type { Model, ModelConstructor } from '@/vstutils/models';
import type { QuerySet } from '@/vstutils/querySet';
import type { IFetchableField } from '@/vstutils/fetch-values';

const dependenceTemplateRegexp = /<<\w+>>/g;

function getPk() {
    const app = getApp();
    const store = app.store.page as ViewStore<PageView>;
    if (typeof store.getInstancePk === 'function') {
        const pk = store.getInstancePk();
        if (pk !== undefined) {
            return pk;
        }
    }
    if (store.view.parent && (store.view.parent as PageView).pkParamName) {
        return app.router.currentRoute.params[(store.view.parent as PageView).pkParamName!];
    }
    return '';
}

function getParentPk() {
    const app = getApp();
    let parentView = app.store.page.view.parent?.parent;

    if (app.store.page.view.isEditPage() && !app.store.page.view.isEditStyleOnly) {
        parentView = parentView?.parent;
    }

    return app.router.currentRoute.params[(parentView as PageView).pkParamName!] || '';
}

const dependenceTemplates = new Map<
    string,
    (data: Record<string, unknown>) => string | number | null | undefined
>([
    ['pk', getPk],
    ['parent_pk', getParentPk],
    ['view_name', () => getApp().store.page.view.name],
    ['parent_view_name', () => getApp().store.page.view.parent?.name ?? ''],
    ['view_level', () => getApp().store.page.view.level],
    ['operation_id', () => getApp().store.page.view.operationId],
    ['parent_operation_id', () => getApp().store.page.view.parent?.operationId ?? ''],
]);

const validAttrs = Array.from(dependenceTemplates.keys());

export interface FKFieldXOptions extends FieldXOptions {
    value_field: string;
    view_field: string;
    usePrefetch: boolean;
    makeLink: boolean;
    fetchData?: boolean;
    dependence?: Record<string, string>;
    filters?: Record<string, string | number>;
    filter_name?: string;
    filter_field_name?: string;
    querysets?: Map<string | undefined, QuerySet[]> | Record<string, QuerySet[]>;
    model?: ModelDefinition;
    list_paths?: string[];
    showLoader?: boolean;
    linkGenerator?: (ctx: {
        value: TRepresent | null | undefined;
        field: FKField;
        data: RepresentData;
    }) => string | undefined;
}

export type TInner = number | string;
export type TRepresent = number | string | Model;

export class FKField extends BaseField<TInner, TRepresent, FKFieldXOptions> implements IFetchableField {
    static NOT_FOUND_TEXT = '[Object not found]';
    readonly _canBeFetched = true;

    declare format: string;

    valueField: string;
    viewField: string;
    usePrefetch: boolean;
    makeLink: boolean;
    fetchData: boolean;
    dependence: Record<string, string>;
    filters?: Record<string, string | number>;
    filterName: string;
    filterFieldName: string;
    showLoader: boolean;

    querysets: Map<string | undefined, QuerySet[]>;
    fkModel?: ModelConstructor;

    constructor(options: FieldOptions<FKFieldXOptions, TInner>) {
        super(options);
        this.valueField = this.props.value_field;
        this.viewField = this.props.view_field;
        this.usePrefetch = this.props.usePrefetch;
        this.makeLink = this.props.makeLink;
        this.dependence = this.props.dependence || {};
        this.filters = this.props.filters;
        this.filterName = this.props.filter_name || this.valueField;
        this.filterFieldName = this.props.filter_field_name || this.valueField;
        this.showLoader = this.props.showLoader ?? true;

        if (this.props.fetchData !== undefined) {
            this.fetchData = this.props.fetchData;
        } else {
            this.fetchData = this.viewField !== this.valueField;
        }

        if (this.props.querysets instanceof Map) {
            this.querysets = this.props.querysets;
        } else {
            this.querysets = new Map(Object.entries(this.props.querysets ?? {}));
        }

        if (!this.fkModel && this.props.model) {
            onAppBeforeInit(() => this.resolveModel());
        }
    }

    translateValue(value: TRepresent) {
        const val = this.getViewFieldValue(value);
        const key = `:model:${this.fkModel!.translateModel || ''}:${this.viewField}:${val as string}`;
        if (i18n.te(key)) {
            return i18n.ts(key);
        }
        return val as TRepresent;
    }

    resolveModel() {
        if (this.props.model) {
            this.fkModel = this.app.modelsResolver.bySchemaObject(this.props.model);
        } else {
            this.error('Could not resolve Model');
        }
    }

    static get mixins() {
        return [FKFieldMixin as ComponentOptions<Vue>];
    }

    override getArrayComponent(): Component {
        return FKArrayFieldMixin;
    }

    getEmptyValue() {
        return null;
    }

    toInner(data: RepresentData): TInner | undefined | null {
        return this.getValueFieldValue(super.toInner(data)) as TInner | undefined | null;
    }

    isSameValues(data1: RepresentData, data2: RepresentData) {
        let val1 = this.toInner(data1);
        if (val1 && typeof val1 === 'object') {
            val1 = val1[this.valueField];
        }
        let val2 = this.toInner(data2);
        if (val2 && typeof val2 === 'object') {
            val2 = val2[this.valueField];
        }
        return val1 === val2;
    }

    prepareFieldForView(path: string) {
        if (this.querysets.has(path)) return;

        let querysets;
        const { list_paths } = this.props;

        if (list_paths) {
            querysets = list_paths.map((listPath) => this.app.views.get(listPath)!.objects!.clone());
            if (!this.fkModel) {
                this.fkModel = querysets[0]!.getResponseModelClass(RequestTypes.LIST);
            }
        } else {
            if (!this.fkModel) {
                this.error(`FK model (${JSON.stringify(this.props.model)}) is not initialized`);
            }
            querysets = [this.app.qsResolver!.findQuerySet(this.fkModel.name, path)];
        }
        this.querysets.set(path, querysets as QuerySet[]);
    }

    _formatQuerysets(querysets: QuerySet[]) {
        return querysets.map((qs) => this._formatQuerysetPath(qs));
    }

    _formatQuerysetPath(queryset: QuerySet) {
        const params = this.app.router?.currentRoute.params ?? {};
        return queryset.clone({ url: formatPath(queryset.url, params) });
    }

    getValueFetchQs(path: string) {
        let qs = this.getAppropriateQuerySet({ path });
        if (qs) {
            return qs;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        qs = this.app.qsResolver?.findQuerySet(this.fkModel!.name, this.app.store.page!.view.path);
        if (qs) {
            return this._formatQuerysetPath(qs);
        }

        return;
    }

    _resolveDependenceValue(key: string, data: Record<string, unknown>) {
        const foundTemplates = new Set(
            Array.from(key.matchAll(dependenceTemplateRegexp), (arr) => arr[0].slice(2, -2)).filter((el) =>
                validAttrs.includes(el),
            ),
        );
        if (foundTemplates.size === 0) {
            return;
        }

        for (const template of foundTemplates) {
            const handler = dependenceTemplates.get(template)!;
            try {
                key = template.replace(template, String(handler(data)));
            } catch (error) {
                console.warn(error);
                return;
            }
        }
        return key;
    }

    /**
     * Method that returns dependence filters. If null is returned it means that at least one of required
     * and non nullable fields is empty and field should be disabled.
     */
    getDependenceFilters(data: RepresentData) {
        const filters: Record<string, string | number> = {};
        for (const [fieldName, filter] of Object.entries(this.dependence)) {
            let dependenceValue = this._resolveDependenceValue(fieldName, data);
            if (dependenceValue !== undefined) {
                filters[filter] = dependenceValue;
                continue;
            }
            const field = this.model!.fields.get(fieldName)!;
            dependenceValue = getDependenceValueAsString(field.toInner(data));
            if (dependenceValue) {
                filters[filter] = dependenceValue;
            } else if (!field.nullable && field.required) {
                return null;
            }
        }
        return filters;
    }
    getValueFieldValue(val: TRepresent | null | undefined): TRepresent | undefined | null {
        if (val !== null && typeof val === 'object') {
            if (val._data) {
                return val._data[this.valueField] as TInner;
            }
        }
        return val;
    }

    getViewFieldValue(val: TRepresent | TInner | null | undefined): unknown {
        if (val !== null && typeof val === 'object') {
            return (val as unknown as Record<string, unknown>)[this.viewField];
        }
        return val;
    }

    /**
     * Method, that selects one, the most appropriate queryset, from querysets array.
     */
    getAppropriateQuerySet({
        data,
        querysets,
        path,
    }: { data?: Record<string, unknown>; querysets?: QuerySet[]; path?: string } = {}) {
        const [qs] = querysets || this.querysets.get(path) || [];
        if (qs) {
            return this._formatQuerysetPath(qs).filter(this.filters || {});
        }
        return undefined;
    }

    getFallbackQs(): QuerySet {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.app.qsResolver!.findQuerySet(this.fkModel!.name);
    }

    getAllQuerysets(path: string) {
        return this._formatQuerysets(
            this.querysets.get(path) || this.querysets.get(undefined) || [this.getFallbackQs()],
        );
    }
}

export default FKField;
