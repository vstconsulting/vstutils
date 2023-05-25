import type { Route } from 'vue-router';
import type { StoreGeneric } from 'pinia';
import type { Action, IView, Sublink } from '@/vstutils/views';
import type { Breadcrumb } from '@/vstutils/breadcrumbs';
import type { InnerData, RepresentData } from '@/vstutils/utils';
import type { FieldsGroup, InstancesList, Model, ModelConstructor } from '@/vstutils/models';
import type { SetFieldValueOptions } from '@/vstutils/fields/base';
import type { PaginationItem } from './helpers';

export interface BaseViewStore extends StoreGeneric {
    view: IView;
    loading: boolean;
    error: unknown;
    response: unknown;
    title: string;
    actions: Action[];
    sublinks: Sublink[];
    initLoading: () => void;
    setLoadingSuccessful: () => void;
    setLoadingError: (error: unknown) => void;
    fetchData: (options?: Record<string, unknown>) => Promise<void>;
    getAutoUpdatePk?: () => number | string | undefined;
    startAutoUpdate: () => void;
    stopAutoUpdate: () => void;
    setAutoUpdateCallback: (callback: () => Promise<void>) => void;
    setAutoUpdatePk: (pk: number | string | undefined) => void;
    breadcrumbs?: Breadcrumb[];
    entityViewClasses?: string[];
    updateData?: () => Promise<void>;
}

export interface ListViewStore extends BaseViewStore {
    count: number;
    pageNumber: number;
    pageSize: number;
    paginationItems: PaginationItem[];
    instances: InstancesList;
    isEmpty: boolean;
    model: ModelConstructor;
    instanceSublinks: Sublink[];
    instanceActions: Action[];
    multiActions: Action[];
    filters: InnerData;
    setInstances: (newInstances: InstancesList) => void;
    setQuery: (query: Route['query']) => void;
    removeInstance: (args: {
        action: Action;
        instance: Model;
        fromList?: boolean;
        purge?: boolean;
    }) => Promise<void | Route>;
    removeInstances: (arg: { action: Action; instances: Model[]; purge?: boolean }) => Promise<void>;
    executeMultiAction(action: Action): Promise<void>;
}

export interface DetailViewStore extends BaseViewStore {
    instance: Model | null;
    sandbox: RepresentData;
    fieldsErrors?: Record<string, unknown>;
    fieldsGroups: FieldsGroup[];
    model: ModelConstructor;

    setInstance(instance: Model): void;
    setFieldValue(options: SetFieldValueOptions): void;
}

export interface PageViewStore extends DetailViewStore {
    getInstancePk(): string | number | undefined | null;
    removeInstance: (args: {
        action: Action;
        instance: Model;
        fromList?: boolean;
        purge?: boolean;
    }) => Promise<void | Route>;
    applyFilters(filters: RepresentData): Promise<void>;
}

export interface PageNewStore extends DetailViewStore {
    save(): Promise<void>;
}

export interface PageEditStore extends DetailViewStore {
    save(): Promise<void>;
    reload(): Promise<void>;
    cancel(): void;
}

export interface ActionStore extends DetailViewStore {
    execute: () => Promise<void>;
}
