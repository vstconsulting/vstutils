import { Schema } from 'swagger-schema-official';
import { ComponentOptions } from 'vue';

import { AggregatedQueriesExecutor } from '@/vstutils/AggregatedQueriesExecutor.js';
import { BaseField, Field, FieldOptions, FieldXOptions } from '@/vstutils/fields/base';
import { DetailPageStore } from '@/vstutils/store/page.js';
import { i18n } from '@/vstutils/translation';
import { formatPath, getApp, getDependenceValueAsString, registerHook, RequestTypes } from '@/vstutils/utils';
import { PageView } from '@/vstutils/views';

import FKFieldMixin from './FKFieldMixin';

import type { Model } from '@/vstutils/models';
import type { QuerySet } from '@/vstutils/querySet';

const dependenceTemplateRegexp = /<<\w+>>/g;

declare module '@/vstutils/models' {
    export class Model {
        __notFound?: true;
    }
}

function getPk() {
    const app = getApp();
    const store = app.store.page as DetailPageStore;
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

const dependenceTemplates = new Map<string, (data: Record<string, unknown>) => string | number>([
    ['pk', getPk],
    ['parent_pk', getParentPk],
    ['view_name', () => getApp().store.page.view.name],
    ['parent_view_name', () => getApp().store.page.view.parent?.name ?? ''],
    ['view_level', () => getApp().store.page.view.level],
    ['operation_id', () => getApp().store.page.view.operationId],
    ['parent_operation_id', () => getApp().store.page.view.parent?.operationId ?? ''],
]);

const validAttrs = Array.from(dependenceTemplates.keys());

interface FKFieldXOptions extends FieldXOptions {
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
    model?: Schema;
    list_paths?: string[];
}

export type TInner = number | string;
export type TRepresent = number | string | Model;

export class FKField
    extends BaseField<TInner, TRepresent, FKFieldXOptions>
    implements Field<TInner, TRepresent, FKFieldXOptions>
{
    static NOT_FOUND_TEXT = '[Object not found]';

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

    querysets: Map<string | undefined, QuerySet[]>;
    fkModel?: typeof Model;

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
            registerHook('app.beforeInit', this.resolveModel.bind(this));
        }
    }

    translateValue(value: TRepresent) {
        const val = this.getViewFieldValue(value);
        const key = `:model:${this.fkModel!.translateModel || ''}:${this.viewField}:${val as string}`;
        if (i18n.te(key)) {
            return i18n.t(key) as string;
        }
        return val as TRepresent;
    }

    resolveModel() {
        if (this.props.model) {
            this.fkModel = this.app.modelsResolver.bySchemaObject(this.props.model);
        } else {
            this._error('Could not resolve Model');
        }
    }

    static get mixins() {
        return [FKFieldMixin as ComponentOptions<Vue>];
    }

    getEmptyValue() {
        return null;
    }

    toInner(data: Record<string, unknown>): TInner | undefined | null {
        return this.getValueFieldValue(super.toInner(data)) as TInner | undefined | null;
    }

    isSameValues(data1: Record<string, unknown>, data2: Record<string, unknown>) {
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
            querysets = list_paths.map((listPath) => this.app.views.get(listPath)!.objects.clone());
            if (!this.fkModel) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                this.fkModel = querysets[0]!.getResponseModelClass(RequestTypes.LIST);
            }
        } else {
            querysets = [this.app.qsResolver!.findQuerySet(this.fkModel!.name, path)];
        }
        this.querysets.set(path, querysets as QuerySet[]);
    }

    _formatQuerysets(querysets: QuerySet[]) {
        return querysets.map((qs) => this._formatQuerysetPath(qs));
    }

    _formatQuerysetPath(queryset: QuerySet) {
        const params = this.app.router?.currentRoute.params || {};
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return queryset.clone({ url: formatPath(queryset.url, params) });
    }

    async afterInstancesFetched(instances: Model[], qs: QuerySet) {
        if (qs.prefetchEnabled && this.usePrefetch && this.fetchData) {
            return this.prefetchValues(instances, this.app.store.page.view.path);
        }
    }

    prefetchValues(instances: Model[], path: string) {
        const qs =
            this.getAppropriateQuerySet({ path }) ||
            (this.app.qsResolver?.findQuerySet(this.fkModel!.name, this.app.store.page.view.path) as
                | QuerySet
                | undefined);
        if (!qs) return;
        return this._fetchRelated(
            instances.map((instance) => this._getValueFromData(instance._data) as TInner),
            qs,
        ).then((fetchedInstances) => {
            for (let i = 0; i < fetchedInstances.length; i++) {
                instances[i]._setFieldValue(this.name, fetchedInstances[i], true);
            }
        });
    }

    /**
     * @param {Array<Object|number>} pks
     * @param {QuerySet} qs
     * @return {Promise<Model[]>}
     */
    _fetchRelated(
        pks: (string | number | undefined | null | Model)[],
        qs: QuerySet,
    ): Promise<(Model | string | number | undefined | null)[]> {
        const executor = new AggregatedQueriesExecutor(
            qs.clone({ prefetchEnabled: false }),
            this.filterName,
            this.filterFieldName,
        );
        const promises = pks.map((pk) => {
            if (typeof pk === 'number' || typeof pk === 'string') {
                return executor.query(pk).catch(() => {
                    const notFound = new this.fkModel!({
                        [this.valueField]: pk,
                        [this.viewField]: i18n.t(FKField.NOT_FOUND_TEXT),
                    });
                    notFound.__notFound = true;
                    return notFound;
                }) as Promise<Model>;
            }
            return Promise.resolve(pk);
        });
        void executor.execute();
        return Promise.all(promises);
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
    getDependenceFilters(data: Record<string, unknown>) {
        const filters: Record<string, string | number> = {};
        for (const [fieldName, filter] of Object.entries(this.dependence)) {
            let dependenceValue = this._resolveDependenceValue(fieldName, data);
            if (dependenceValue !== undefined) {
                filters[filter] = dependenceValue;
                continue;
            }
            const field = this.model!.fields.get(fieldName) as Field;
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
