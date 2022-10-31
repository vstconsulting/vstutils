import type { ComponentOptions } from 'vue';
import type { Vue } from 'vue/types/vue';
import type { Route, RouteConfig } from 'vue-router';
import type { Operation as SwaggerOperation } from 'swagger-schema-official';
import {
    createActionViewStore,
    createListViewStore,
    createEditViewStore,
    createNewViewStore,
    createDetailViewStore,
} from '../store';
import { ListViewComponent } from '../components/list/';
import { OneEntity } from '../components/page';
import { formatPath, HttpMethods, joinPaths, pathToArray, ViewTypes } from '../utils';
import type { QuerySet } from '../querySet';
import { Model } from '../models';
import type { BaseField } from '../fields/base';
import { useBasePageData } from '../store/helpers';
import { IAppInitialized } from '../app';
export { ViewTypes };

export interface Operation {
    name: string;
    title: string;
    styles?: Record<string, string>;
    classes?: string[];
    iconClasses?: string[];
    appendFragment?: string;
    hidden?: boolean;
}

export interface Sublink extends Operation {
    href?: string;
}

/**
 * Object that describes one action.
 * For empty action path and method are required.
 * For non empty action component or href must me provided.
 */
export interface Action extends Operation {
    isEmpty: boolean;
    isMultiAction: boolean;
    component?: any;
    path?: string;
    href?: string;
    method?: HttpMethods;
    doNotShowOnList?: boolean;
    confirmationRequired?: boolean;
    view?: View;
    responseModel?: typeof Model;
    handler?: (args: {
        action: Action;
        instance?: Model;
        fromList?: boolean;
        disablePopUp?: boolean;
    }) => Promise<void>;
    handlerMany?: (args: { action: Action; instances: Model[]; disablePopUp?: boolean }) => Promise<void>;
    redirectPath?: string | (() => string);
    onAfter?: (args: { app: IAppInitialized; action: Action; response: unknown; instance?: Model }) => void;
}

export interface NotEmptyAction extends Action {
    isEmpty: false;
    requestModel: typeof Model;
}

type ViewType = keyof typeof ViewTypes;

interface ViewParams extends SwaggerOperation {
    operationId: string;
    level: number;
    name: string;
    path: string;
    method: HttpMethods;
    type?: ViewType;
    title?: string;
    isDeepNested?: boolean;
    'x-hidden'?: boolean;
    'x-subscribe-labels'?: string[];
    requestModel?: typeof Model;
    responseModel?: typeof Model;
    autoupdate?: boolean;
    routeName?: string;
    [key: string]: any;
}

/**
 * View class - constructor, that returns view object.
 */
export class View {
    static viewType: ViewType = 'PAGE';

    params: ViewParams;
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
    mixins: (ComponentOptions<Vue> | typeof Vue)[];

    sublinks = new Map<string, Sublink>();
    actions = new Map<string, Action>();
    parent: View | null = null;

    showOperationButtons = true;
    showBackButton = true;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    storeDefinitionFactory: (view: any) => () => unknown = (view) => () => useBasePageData(view);

    constructor(params: ViewParams, objects: QuerySet, mixins: (ComponentOptions<Vue> | typeof Vue)[] = []) {
        this.params = params;
        this.objects = objects;
        this.type = params.type ?? (this.constructor as typeof View).viewType;
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

    extendStore(customDefinition: (originalStore: unknown) => unknown) {
        const originalStoreDefinitionFactory = this.storeDefinitionFactory;
        this.storeDefinitionFactory = (view: any) => () =>
            customDefinition(originalStoreDefinitionFactory(view)());
    }

    /**
     * Property that returns array with request and response model
     * @return {Function[]}
     */
    get modelsList() {
        return [this.params.requestModel || null, this.params.responseModel || null];
    }

    getStoreDefinition(): () => unknown {
        return this.storeDefinitionFactory(this);
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
            mixins: this.mixins,
            provide() {
                return {
                    view: thisView,
                    pageComponent: this as Vue,
                };
            },
        };
    }

    _propsFunc(route: Route): Record<string, any> {
        const props = {
            view: this,
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

interface ListViewParams extends ViewParams {
    filters: Record<string, BaseField<any, any>>;
    'x-deep-nested-view'?: string;
}

export class ListView extends View {
    static viewType: ViewType = 'LIST';

    multiActions = new Map<string, Action>();
    pageView: PageView | null = null;
    nestedQueryset: QuerySet | null = null;
    filters: Record<string, BaseField<any, any>>;

    deepNestedViewFragment: string | null;
    deepNestedView: ListView | null;
    deepNestedParentView: ListView | null;

    storeDefinitionFactory: (view: any) => any = createListViewStore;

    constructor(
        params: ListViewParams,
        objects: QuerySet,
        mixins: (ComponentOptions<Vue> | typeof Vue)[] = [ListViewComponent as ComponentOptions<Vue>],
    ) {
        super(params, objects, mixins);

        this.filters = params.filters;

        this.deepNestedViewFragment = params['x-deep-nested-view'] || null;
        this.deepNestedView = null;
        this.deepNestedParentView = null;
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
}

interface PageViewParams extends ViewParams {
    isFileResponse?: boolean;
}

export class PageView extends View {
    static viewType: ViewType = 'PAGE';

    parent: ListView | null = null;
    listView: ListView | null = null;
    pkParamName: string | null = null;
    isFileResponse: boolean;
    hideReadonlyFields = false;
    filtersModelClass: typeof Model | null = null;

    storeDefinitionFactory: (view: any) => any = createDetailViewStore;

    constructor(
        params: PageViewParams,
        objects: QuerySet,
        mixins: (ComponentOptions<Vue> | typeof Vue)[] = [OneEntity as ComponentOptions<Vue>],
    ) {
        super(params, objects, mixins);
        this.isFileResponse = params.isFileResponse ?? false;
    }

    getRoutePath(): string {
        const deepNestedParentView = this.listView?.deepNestedParentView;
        if (deepNestedParentView) {
            // Example: /group/(\w+/groups?)*/:id/groups/:groups_id/ | /group/6/groups/7/groups/8/groups/9/
            return '{0}/(\\w+/{1})*/:{3}/{1}/:{2}/'.format([
                deepNestedParentView.getRoutePath().replace(/\/$/, ''),
                deepNestedParentView.deepNestedViewFragment,
                this.pkParamName,
                (this.parent?.parent as PageView).pkParamName,
            ]);
        } else if (this.isDeepNested) {
            return joinPaths(this.parent?.getRoutePath(), `:${this.pkParamName ?? ''}`);
        }
        return super.getRoutePath();
    }
}

interface PageNewParams extends ViewParams {
    'x-allow-append'?: boolean;
}

export class PageNewView extends View {
    static viewType: ViewType = 'PAGE_NEW';

    nestedAllowAppend: boolean;
    multiActions = new Map<string, Action>();
    listView: ListView | null = null;
    hideReadonlyFields = true;

    storeDefinitionFactory: (view: any) => any = createNewViewStore;

    constructor(
        params: PageNewParams,
        objects: QuerySet,
        mixins: (ComponentOptions<Vue> | typeof Vue)[] = [OneEntity as ComponentOptions<Vue>],
    ) {
        super(params, objects, mixins);

        /**
         * Property flag indicates that nested view allowing append objects from shared view.
         */
        this.nestedAllowAppend = params['x-allow-append'] ?? false;
    }

    getRoutePath() {
        return joinPaths(this.parent?.getRoutePath(), pathToArray(this.path).last);
    }
}

export class PageEditView extends PageView {
    static viewType: ViewType = 'PAGE_EDIT';

    isEditStyleOnly = false;
    isPartial: boolean;
    hideReadonlyFields = true;

    storeDefinitionFactory: (view: any) => any = createEditViewStore;

    constructor(
        params: PageViewParams,
        objects: QuerySet,
        mixins: (ComponentOptions<Vue> | typeof Vue)[] = [OneEntity as ComponentOptions<Vue>],
    ) {
        super(params, objects, mixins);

        this.isPartial = params.method === HttpMethods.PATCH;
    }

    getRoutePath() {
        if (this.isDeepNested) {
            return joinPaths(this.parent?.getRoutePath(), pathToArray(this.path).last);
        }
        return super.getRoutePath();
    }
}

interface ActionViewParams extends PageViewParams {
    action: NotEmptyAction;
}

export class ActionView extends View {
    static viewType: ViewType = 'ACTION';
    hideReadonlyFields = true;
    method: HttpMethods;
    action: NotEmptyAction;

    storeDefinitionFactory: (view: any) => any = createActionViewStore;

    constructor(
        params: ActionViewParams,
        objects: QuerySet,
        mixins: (ComponentOptions<Vue> | typeof Vue)[] = [OneEntity as ComponentOptions<Vue>],
    ) {
        super(params, objects, mixins);

        this.method = params.method;
        this.action = params.action;
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
}
