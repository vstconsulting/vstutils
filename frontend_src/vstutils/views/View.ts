import type { StoreState } from 'pinia';
import { defineStore } from 'pinia';
import type { Component, ComponentOptions, Ref } from 'vue';
import { ref, toRef } from 'vue';

import {
    createUniqueIdGenerator,
    formatPath,
    getApp,
    HttpMethods,
    joinPaths,
    pathToArray,
    RequestTypes,
    ViewTypes,
} from '@/vstutils/utils';

import ListViewComponent from '@/vstutils/components/list/ListViewComponent.vue';
import OneEntity from '@/vstutils/components/page/OneEntity.vue';
import {
    createActionViewStore,
    createDetailViewStore,
    createEditViewStore,
    createListViewStore,
    createNewViewStore,
    useBasePageData,
} from '@/vstutils/store';
import { i18n } from '@/vstutils/translation';

import type { ComponentOptionsMixin } from 'vue/types/v3-component-options';
import type { IAppInitialized } from '@/vstutils/app';
import type { Model, ModelConstructor } from '@/vstutils/models';
import type {
    BaseViewStore,
    ListViewStore,
    PageViewStore,
    PageNewStore,
    ActionStore,
    PageEditStore,
    DetailViewStore,
} from '@/vstutils/store';

import type { HttpMethod, RepresentData } from '@/vstutils/utils';
import type { Vue } from 'vue/types/vue';
import type { Route, RouteConfig } from 'vue-router';
import type { Operation as SwaggerOperation } from 'swagger-schema-official';
import type { QuerySet } from '../querySet';
import type { BaseField, Field } from '../fields/base';
import type { ViewProps } from './props';

export { ViewTypes };

export interface Operation {
    name: string;
    title: string;
    style?: Record<string, string | number> | string;
    classes?: string[];
    iconClasses?: string[];
    appendFragment?: string;
    hidden?: boolean;
    doNotShowOnList?: boolean;
    doNotGroup?: boolean;
}

export interface Sublink extends Operation {
    href?: string;
}

type ViewMixin = unknown;

const getViewStoreId = createUniqueIdGenerator();

/**
 * Object that describes one action.
 * For empty action path and method are required.
 * For non empty action component or href must me provided.
 */
export interface Action extends Operation {
    isEmpty?: boolean;
    isMultiAction?: boolean;
    component?: any;
    path?: string;
    href?: string;
    method?: HttpMethod;
    confirmationRequired?: boolean;
    view?: ActionView;
    responseModel?: ModelConstructor;
    handler?: (args: {
        action: Action;
        instance?: Model;
        fromList?: boolean;
        disablePopUp?: boolean;
    }) => Promise<any> | any;
    handlerMany?: (args: {
        action: Action;
        instances: Model[];
        disablePopUp?: boolean;
    }) => Promise<any> | any;
    redirectPath?: string | (() => string);
    onAfter?: (args: { app: IAppInitialized; action: Action; response: unknown; instance?: Model }) => void;
}

export interface NotEmptyAction extends Action {
    isEmpty: false;
    requestModel: ModelConstructor;
}

type ViewType = keyof typeof ViewTypes;

export interface ViewParams extends SwaggerOperation {
    operationId: string;
    level: number;
    name: string;
    path: string;
    method: HttpMethod;
    type?: ViewType;
    title?: string;
    isDeepNested?: boolean;
    'x-hidden'?: boolean;
    'x-subscribe-labels'?: string[];
    requestModel?: ModelConstructor;
    responseModel?: ModelConstructor;
    autoupdate?: boolean;
    routeName?: string;
    [key: string]: any;
}

export type ViewStore<T extends IView> = ReturnType<T['_createStore']>;

interface ResolveStateArg<S> {
    route: Route;
    store?: S;
}

export interface IView<
    TStore extends BaseViewStore = BaseViewStore,
    TParams extends ViewParams = ViewParams,
    TStateToSave = unknown,
> {
    type: ViewType;
    path: string;
    operationId: string;
    title: string;
    params: TParams;
    parent?: IView | null;
    level: number;
    name: string;
    isDeepNested: boolean;
    hidden: boolean;
    routeName: string;
    mixins: ViewMixin[];

    sublinks: Map<string, Sublink>;
    actions: Map<string, Action>;

    autoupdate?: boolean;
    subscriptionLabels?: string[] | null;

    objects?: QuerySet;

    modelsList: [ModelConstructor | null, ModelConstructor | null];

    showOperationButtons: boolean;
    showBackButton: boolean;

    resolveState(args: ResolveStateArg<TStore>): Promise<TStateToSave>;
    getSavedState(): StoreState<TStateToSave> | undefined;

    getTitle(state?: StoreState<TStateToSave>): string;

    /**
     * Creates new store instance for currently opened page
     * @internal
     * */
    _createStore(): TStore;

    getRoutePath(): string;
    toRoute(): RouteConfig;

    isEditPage(): this is PageEditView;
    isDetailPage(): this is PageView;
    isListPage(): this is ListView;
    isNewPage(): this is PageNewView;
    isActionPage(): this is ActionView;
}

/**
 * View class - constructor, that returns view object.
 */
export abstract class BaseView<
    TStore extends BaseViewStore = BaseViewStore,
    TParams extends ViewParams = ViewParams,
    TStateToSave = object,
> implements IView<TStore, TParams, TStateToSave>
{
    static viewType: ViewType = 'PAGE';

    params: TParams;
    objects: QuerySet;
    type: ViewType;
    operationId: string;
    level: number;
    name: string;
    path: string;
    title: string;
    isDeepNested: boolean;
    hidden: boolean;
    routeName: string;
    autoupdate: boolean;
    subscriptionLabels: string[] | null;
    mixins: ViewMixin[];

    sublinks = new Map<string, Sublink>();
    actions = new Map<string, Action>();
    parent?: IView | null;

    showOperationButtons = true;
    showBackButton = true;

    _extendStoreHook = <T>(def: T): T => def;

    constructor(params: TParams, objects: QuerySet, mixins: ViewMixin[] = []) {
        this.params = params;
        this.objects = objects;
        this.type = params.type ?? (this.constructor as typeof BaseView).viewType;
        this.operationId = params.operationId;
        this.level = params.level;
        this.name = params.name;
        this.path = params.path;
        this.title = params.title || params.name;
        this.isDeepNested = params.isDeepNested ?? false;
        this.hidden = params['x-hidden'] ?? false;
        this.routeName = params.routeName ?? params.path;
        this.autoupdate = params.autoupdate ?? false;
        this.subscriptionLabels = params['x-subscribe-labels'] || null;
        this.mixins = mixins;
    }

    isEditPage(): this is PageEditView {
        return this instanceof PageEditView;
    }
    isDetailPage(): this is PageView {
        return this instanceof PageView;
    }
    isListPage(): this is ListView {
        return this instanceof ListView;
    }
    isNewPage(): this is PageNewView {
        return this instanceof PageNewView;
    }
    isActionPage(): this is ActionView {
        return this instanceof ActionView;
    }

    extendStore(hook: <T>(originalStore: T) => T) {
        const currentHook = this._extendStoreHook;
        this._extendStoreHook = (def) => hook(currentHook(def));
    }

    _createStoreWithHook<T>(definition: T) {
        const useStore = defineStore(`page_${getViewStoreId()}`, () => this._extendStoreHook(definition));
        return useStore();
    }

    abstract _createStore(): TStore;

    resolveState(args: ResolveStateArg<TStore>): Promise<TStateToSave> {
        return Promise.resolve({} as TStateToSave);
    }
    getSavedState() {
        return getApp().store.viewItemsMap.get(this.path)?.state as StoreState<TStateToSave> | undefined;
    }

    /**
     * Property that returns array with request and response model
     */
    get modelsList(): [ModelConstructor | null, ModelConstructor | null] {
        return [this.params.requestModel || null, this.params.responseModel || null];
    }

    getTitle(state?: StoreState<TStateToSave>): string {
        return i18n.st(this.title);
    }

    /**
     * Method returns string with template of route path for current view.
     * @return {string}
     */
    getRoutePath() {
        return this.path.replace(/{/g, ':').replace(/}/g, '');
    }

    /**
     * Method that returns Vue component for view
     * @return {Object}
     */
    getComponent(): ComponentOptions<Vue> | typeof Vue {
        // If we provide `this` in `data` directly then `view` will become Vue component
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const thisView = this;
        return {
            mixins: this.mixins as ComponentOptionsMixin[],
            provide() {
                return {
                    view: thisView,
                    pageComponent: this as Vue,
                };
            },
        };
    }

    _propsFunc(route: Route): ViewProps {
        const props = {
            view: this as IView,
            query: { ...route.query },
            params: { ...route.params },
        };
        return props;
    }

    toRoute(): RouteConfig {
        return {
            name: this.routeName,
            path: this.getRoutePath(),
            component: this.getComponent(),
            props: this._propsFunc.bind(this),
            meta: {
                view: this,
            },
        };
    }
}

export class View extends BaseView {
    _createStore(): BaseViewStore {
        return this._createStoreWithHook(useBasePageData(this));
    }
}

interface ListViewParams extends ViewParams {
    filters: Record<string, BaseField<any, any>>;
    'x-deep-nested-view'?: string;
}
export class ListView extends BaseView<ListViewStore, ListViewParams> {
    static viewType: ViewType = 'LIST';

    declare params: ListViewParams;
    multiActions = new Map<string, Action>();
    pageView: PageView | null = null;
    nestedQueryset: QuerySet | null = null;
    filters: Record<string, Field>;
    enableSearch = true;

    deepNestedViewFragment: string | null;
    deepNestedView: ListView | null;
    deepNestedParentView: ListView | null;

    constructor(params: ListViewParams, objects: QuerySet, mixins = [ListViewComponent]) {
        super(params, objects, mixins);

        this.filters = params.filters;

        this.deepNestedViewFragment = params['x-deep-nested-view'] || null;
        this.deepNestedView = null;
        this.deepNestedParentView = null;
    }

    _createStore(): ListViewStore {
        return this._createStoreWithHook(createListViewStore(this));
    }

    getRoutePath(): string {
        if (this.deepNestedParentView) {
            return '{0}(/\\w+/{1})*/:{2}/{1}/'.format([
                this.deepNestedParentView.getRoutePath().replace(/\/$/, ''),
                this.deepNestedParentView.deepNestedViewFragment,
                this.deepNestedParentView.pageView?.pkParamName,
            ]);
        }
        if (this.isDeepNested) {
            return joinPaths(this.parent?.getRoutePath(), pathToArray(this.path).last);
        }
        return super.getRoutePath();
    }

    openPageView(instance: Model) {
        if (this.pageView?.hidden) {
            return;
        }

        const app = getApp();
        const router = getApp().router;
        const route = router.currentRoute;

        if (this.isDeepNested) {
            return router.push(joinPaths(route.path, instance.getPkValue()));
        }
        const pageView = this.pageView;
        if (pageView) {
            const link = formatPath(pageView.path, route.params, instance);
            if (pageView.isFileResponse) {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                window.open(`${app.api.baseURL}/${app.api.defaultVersion}${link}`);
            } else {
                void router.push(link);
            }
        }
        return;
    }
}

interface PageViewParams extends ViewParams {
    isFileResponse?: boolean;
}

export interface PageViewStateToSave {
    instance: Ref<Model | null>;
}

export abstract class DetailView<
    TStore extends DetailViewStore = DetailViewStore,
    TParams extends ViewParams = ViewParams,
    TStateToSave = object,
> extends BaseView<TStore, TParams, TStateToSave> {
    hideReadonlyFields = false;
    wrapperClasses = 'col-12';

    abstract getModel(): ModelConstructor;

    getFieldsGroups(options: { data: RepresentData }) {
        return this.getModel().getFieldsGroups(options);
    }

    beforeFieldsGroups?: () => Component;
    afterFieldsGroups?: () => Component;
}

export class PageView extends DetailView<PageViewStore, PageViewParams, PageViewStateToSave> {
    static viewType: ViewType = 'PAGE';

    declare params: PageViewParams;

    parent: ListView | null = null;
    listView: ListView | null = null;
    pkParamName: string | null = null;
    isFileResponse: boolean;
    filtersModelClass: ModelConstructor | null = null;
    useViewFieldAsTitle = true;

    constructor(params: PageViewParams, objects: QuerySet, mixins = [OneEntity]) {
        super(params, objects, mixins);
        this.isFileResponse = params.isFileResponse ?? false;
    }

    _createStore(): PageViewStore {
        return this._createStoreWithHook(createDetailViewStore(this));
    }

    getRoutePath(): string {
        const deepNestedParentView = this.listView?.deepNestedParentView;
        if (deepNestedParentView) {
            // Example: /group/(\w+/groups?)*/:id/groups/:groups_id/ | /group/6/groups/7/groups/8/groups/9/
            return '{0}/(\\w+/{1})*/:{3}/{1}/:{2}/'.format([
                deepNestedParentView.getRoutePath().replace(/\/$/, ''),
                deepNestedParentView.deepNestedViewFragment,
                this.pkParamName,
                (this.parent?.parent as unknown as PageView).pkParamName,
            ]);
        } else if (this.isDeepNested) {
            return joinPaths(this.parent?.getRoutePath(), `:${this.pkParamName ?? ''}`);
        }
        return super.getRoutePath();
    }

    getModel() {
        return this.objects.getResponseModelClass(RequestTypes.RETRIEVE);
    }

    async resolveState(args: ResolveStateArg<PageViewStore>): Promise<PageViewStateToSave> {
        const { route, store } = args;
        if (store) {
            return { instance: toRef(store, 'instance') };
        }

        // If currently opened page is edit page and this view is parent of that edit page
        // then we can use instance from store to avoid making extra request
        const currentPageStore = getApp().store.page;
        if (currentPageStore.view.isEditPage() && currentPageStore.view.parent === this) {
            return { instance: toRef(currentPageStore as ViewStore<PageEditView>, 'instance') };
        }

        return {
            instance: ref(
                await this.objects
                    .formatPath(route.params)
                    .get(this.pkParamName ? route.params[this.pkParamName] : undefined),
            ),
        };
    }

    getTitle(state?: StoreState<PageViewStateToSave>): string {
        if (this.useViewFieldAsTitle && state?.instance) {
            const value = state.instance.getViewFieldString(false);
            if (value) {
                return value;
            }
        }
        return super.getTitle(state);
    }
}

interface PageNewParams extends ViewParams {
    'x-allow-append'?: boolean;
}

export class PageNewView extends DetailView<PageNewStore, PageNewParams> {
    static viewType: ViewType = 'PAGE_NEW';

    declare params: PageNewParams;
    nestedAllowAppend: boolean;
    multiActions = new Map<string, Action>();
    listView: ListView | null = null;
    hideReadonlyFields = true;

    constructor(params: PageNewParams, objects: QuerySet, mixins = [OneEntity]) {
        super(params, objects, mixins);

        /**
         * Property flag indicates that nested view allowing append objects from shared view.
         */
        this.nestedAllowAppend = params['x-allow-append'] ?? false;
    }

    _createStore(): PageNewStore {
        return this._createStoreWithHook(createNewViewStore(this));
    }

    getRoutePath() {
        return joinPaths(this.parent?.getRoutePath(), pathToArray(this.path).last);
    }

    getModel() {
        return this.objects.getResponseModelClass(RequestTypes.CREATE);
    }
}

export class PageEditView extends DetailView<PageEditStore> {
    static viewType: ViewType = 'PAGE_EDIT';

    parent: PageView | null = null;
    isEditStyleOnly = false;
    isPartial: boolean;
    hideReadonlyFields = true;

    constructor(params: PageViewParams, objects: QuerySet, mixins = [OneEntity]) {
        super(params, objects, mixins);

        this.isPartial = params.method === HttpMethods.PATCH;
    }

    _createStore(): PageEditStore {
        return this._createStoreWithHook(createEditViewStore(this));
    }

    getRoutePath() {
        if (this.isDeepNested) {
            return joinPaths(this.parent?.getRoutePath(), pathToArray(this.path).last);
        }
        return super.getRoutePath();
    }

    getModel() {
        return this.objects.getRequestModelClass(
            this.isPartial ? RequestTypes.PARTIAL_UPDATE : RequestTypes.UPDATE,
        );
    }
}

interface ActionViewParams extends PageViewParams {
    action: NotEmptyAction;
}

export class ActionView extends DetailView<ActionStore, ActionViewParams> {
    static viewType: ViewType = 'ACTION';
    declare params: ActionViewParams;
    hideReadonlyFields = true;
    method: HttpMethod;
    action: NotEmptyAction;

    constructor(params: ActionViewParams, objects: QuerySet, mixins = [OneEntity]) {
        super(params, objects, mixins);

        this.method = params.method;
        this.action = params.action;
    }

    _createStore(): ActionStore {
        return this._createStoreWithHook(createActionViewStore(this));
    }

    getRoutePath() {
        return joinPaths(this.parent?.getRoutePath(), pathToArray(this.path).last);
    }

    getRequestPath(currentRoute: Route): string {
        const rootNestedView = (this.parent?.parent as ListView | undefined)?.deepNestedParentView;
        if (rootNestedView) {
            const [pk, actionName] = pathToArray(currentRoute.path).slice(-2);
            return joinPaths(formatPath(rootNestedView.path, currentRoute.params), pk, actionName);
        }
        return formatPath(this.path, currentRoute.params);
    }

    getRedirectUrl(currentRoute: Route): string {
        if (this.isDeepNested) {
            return currentRoute.path.replace(/[^/]+\/$/, '');
        }
        if (this.parent) {
            return formatPath(this.parent.path, currentRoute.params);
        }
        return currentRoute.path;
    }

    getModel() {
        return this.action.requestModel;
    }
}
