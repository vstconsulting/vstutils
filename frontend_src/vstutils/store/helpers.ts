import {
    ref,
    reactive,
    computed,
    shallowRef,
    set,
    del,
    Ref,
    onUnmounted,
    onMounted,
    onBeforeUnmount,
} from 'vue';
import { defineStore, Store, StoreActions, StoreState, StoreGetters } from 'pinia';
import { Model, ModelValidationError } from '../models';
import type { QuerySet } from '../querySet';
import type { View, ActionView, NotEmptyAction } from '../views';
import signals from '../signals';
import {
    openPage,
    getRedirectUrlFromResponse,
    getApp,
    makeQueryString,
    IGNORED_FILTERS,
    mergeDeep,
    getUniqueId,
    classesFromFields,
    smartTranslate,
} from '../utils';
import { useBreadcrumbs } from '../breadcrumbs';
import { i18n } from '../translation';
import type { NavigationGuard, Route } from 'vue-router';
import type { IApp } from '@/vstutils/app';
import { APIResponse } from '../api';

export interface InstancesList extends Array<Model> {
    extra?: {
        count?: number;
        [key: string]: any;
    };
}

export function getRedirectUrl(): string {
    const url = getApp()
        .router.currentRoute.path.replace(/\/edit\/?$/, '')
        .replace(/\/new\/?$/, '');
    return url;
}

export const useInstanceTitle = ({ view, instance }: { view: View; instance: Ref<Model | null> }) => {
    return computed(() => instance.value?.getViewFieldString(false) || smartTranslate(view.title));
};

export const useQuerySet = (view: View) => {
    const app = getApp();
    const queryset = ref<QuerySet>(view.objects.formatPath(app.router.currentRoute.params));
    function setQuerySet(qs: QuerySet) {
        queryset.value = qs;
    }
    return { queryset, setQuerySet };
};

export const useEntityViewClasses = (modelClass: Ref<typeof Model>, data: Ref<Record<string, any>>) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
    const flatFields = computed(() => Array.from(modelClass.value.fields.values()));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return computed<string[]>(() => classesFromFields(flatFields.value, data.value));
};

export const useOperations = ({
    view,
    data,
    isListItem = false,
}: {
    view: View;
    data?: Ref<Record<string, any>>;
    isListItem?: boolean;
}) => {
    const actions = computed(() => {
        const obj = {
            actions: Array.from(view.actions.values()).filter((action) => !action.hidden),
            data: data?.value,
            isListItem,
        };
        signals.emit(`<${view.path}>filterActions`, obj);
        return obj.actions;
    });
    const sublinks = computed(() => {
        const obj = {
            sublinks: Array.from(view.sublinks.values()).filter((sublink) => !sublink.hidden),
            data: data?.value,
            isListItem,
        };
        signals.emit(`<${view.path}>filterSublinks`, obj);
        return obj.sublinks;
    });

    return { actions, sublinks };
};

export const useBasePageData = (view: View) => {
    const loading = ref(false);
    const error = ref<unknown>(null);
    const response = ref<unknown>(null);
    const title = computed<string>(() => {
        return smartTranslate(view.title);
    });
    const breadcrumbs = useBreadcrumbs();

    function initLoading() {
        error.value = null;
        response.value = null;
        loading.value = true;
    }

    function setLoadingSuccessful() {
        loading.value = false;
        response.value = true;
    }

    function setLoadingError(newError: unknown) {
        loading.value = false;
        error.value = newError;
    }

    function fetchData() {
        setLoadingSuccessful();
    }

    return {
        ...useOperations({ view, isListItem: false }),
        loading,
        error,
        response,
        title,
        view: ref(view),
        breadcrumbs,
        initLoading,
        setLoadingSuccessful,
        setLoadingError,
        fetchData,
    };
};

export const useSelection = (instances: Ref<Model[]>) => {
    const selection = ref<(number | string)[]>([]);

    const allSelected = computed(() =>
        instances.value.every((instance) =>
            selection.value.includes(instance.getPkValue() as number | string),
        ),
    );

    function setSelection(newSelection?: string[] | number[]) {
        selection.value = newSelection ?? [];
    }

    function unselectIds(ids: (number | string)[]) {
        selection.value = selection.value.filter((id) => !ids.includes(id));
    }

    function toggleSelection(instanceId: number | string) {
        const index = selection.value.indexOf(instanceId);
        if (index === -1) {
            selection.value.push(instanceId);
        } else {
            del(selection.value, index);
        }
    }

    function toggleAllSelection() {
        setSelection(
            allSelected.value ? [] : instances.value.map((instance) => instance.getPkValue() as string),
        );
    }

    return { selection, allSelected, setSelection, unselectIds, toggleSelection, toggleAllSelection };
};

export function filterNonEmpty(obj: Record<string, any>) {
    return Object.fromEntries(Object.entries(obj).filter((entry) => entry[1]));
}

export function useListFilters(qs: Ref<QuerySet>) {
    const app = getApp();
    const pagination = reactive<{
        count: number;
        pageSize: number;
        pageNumber: number;
    }>({
        count: 0,
        pageSize: app.config.defaultPageLimit,
        pageNumber: 1,
    });

    const filters = ref<Record<string, any>>({});

    function setQuery(query: Record<string, any>) {
        query = filterNonEmpty(query);
        const limit = pagination.pageSize;
        const page = Number(query.page) || 1;
        filters.value = query;
        pagination.pageNumber = page;
        qs.value = qs.value.clone({
            query: mergeDeep({ limit, offset: limit * (page - 1) }, query),
        });
    }

    return { pagination, filters, setQuery };
}

export function useQueryBasedFiltering() {
    const searchFieldName = '__search';

    function getFiltersPrepared(filters: Record<string, any>) {
        return Object.fromEntries(
            Object.keys(filters)
                .filter((name) => filters[name] !== undefined)
                .map((name) => [name, filters[name]]),
        );
    }

    function applyFilters(filters: Record<string, any>): Promise<Route | void> {
        filters = getFiltersPrepared(filters);

        for (const filter in filters) {
            if (IGNORED_FILTERS.includes(filter)) {
                delete filters[filter];
            }
        }

        return openPage(getApp().rootVm.$route.path + makeQueryString(filters));
    }

    function applyFieldsFilters(filters: Record<string, any>) {
        return applyFilters({
            ...filters,
            [searchFieldName]: getApp().rootVm.$route.query[searchFieldName],
        });
    }

    function applySearchFilter(value: string) {
        return applyFilters({
            ...getApp().rootVm.$route.query,
            [searchFieldName]: value,
        });
    }

    return { applyFilters, applyFieldsFilters, applySearchFilter };
}

export const PAGE_WITH_INSTANCE = () => {
    const app = getApp();

    const instance = shallowRef<Model | null>(null);
    const sandbox = ref<Record<string, any>>({});
    const providedInstance = computed<Model | undefined>(
        () => app.rootVm.$route.params.providedInstance as unknown as Model | undefined,
    );

    function setInstance(newInstance: Model) {
        instance.value = newInstance;
        sandbox.value = instance.value._getRepresentData();
    }

    function setFieldValue({ field, value }: { field: string; value: unknown }) {
        set(sandbox.value, field, value);
    }

    return { instance, sandbox, providedInstance, setInstance, setFieldValue };
};

export const PAGE_WITH_EDITABLE_DATA = <T extends ReturnType<typeof PAGE_WITH_INSTANCE>>(base: T) => {
    const fieldsErrors = ref<Record<string, any>>({});
    const changedFields = ref<string[]>([]);
    const isPageChanged = computed<boolean>(() => changedFields.value.length > 0);

    function validateAndSetInstanceData(params?: { instance?: Model | null; data?: Record<string, any> }) {
        const instance = params?.instance ?? base.instance.value;
        const data = params?.data ?? base.sandbox.value;
        if (instance) {
            instance._validateAndSetData(data);
        }
    }

    function setFieldValue({ field, value }: { field: string; value: unknown }) {
        del(fieldsErrors.value, field);
        if (!changedFields.value.includes(field)) {
            changedFields.value.push(field);
        }
        return base.setFieldValue({ field, value });
    }

    return {
        ...base,
        validateAndSetInstanceData,
        setFieldValue,
        fieldsErrors,
        changedFields,
        isPageChanged,
    };
};

export const createActionStore = (view: ActionView) => {
    const pageWithEditableData = PAGE_WITH_EDITABLE_DATA(PAGE_WITH_INSTANCE());

    const app = getApp();
    const model = computed<typeof Model>(() => view.action.requestModel);

    async function execute() {
        try {
            pageWithEditableData.changedFields.value = [];
            const executeAction = view.actions.get('execute') as NotEmptyAction;
            const response = await app.actions.executeWithData({
                action: executeAction,
                data: pageWithEditableData.sandbox.value,
                model: model.value,
                method: view.method,
                path: view.getRequestPath(app.router.currentRoute),
                throwError: true,
            });
            pageWithEditableData.fieldsErrors.value = {};
            void openPage(
                executeAction.redirectPath ??
                    getRedirectUrlFromResponse((response as APIResponse).data, view.action.responseModel) ??
                    view.getRedirectUrl(app.router.currentRoute),
            );
        } catch (e) {
            if (e instanceof ModelValidationError) {
                pageWithEditableData.fieldsErrors.value = e.toFieldsErrors();
            } else {
                console.warn(e);
            }
        }
    }

    pageWithEditableData.setInstance(new model.value());

    return {
        ...pageWithEditableData,
        model,
        execute,
    };
};

type BaseViewStore = Store<
    `page_${string}`,
    StoreState<ReturnType<typeof useBasePageData>>,
    StoreGetters<ReturnType<typeof useBasePageData>>,
    StoreActions<ReturnType<typeof useBasePageData>>
> & {
    fetchData?: () => Promise<void>;
    updateData?: () => Promise<void>;
    getAutoUpdatePk?: () => string | number;
};

export function useViewStore<T extends View>(view: T) {
    const app = getApp();
    const store = defineStore(`page_${getUniqueId()}`, view.getStoreDefinition())() as BaseViewStore;
    if (store.fetchData) {
        store.fetchData();
    }

    app.store.setPage(store);

    onUnmounted(() => {
        store.$dispose();
    });

    return store;
}

export const onRouterBeforeEach = (() => {
    const handlers = new Map<number, NavigationGuard>();
    let lastId = 0;

    signals.once('app.afterInit', (args: unknown) => {
        const app = (args as { app: IApp }).app;
        app.router!.beforeEach((to, from, next) => {
            if (handlers.size > 0) {
                for (const handler of handlers.values()) {
                    handler(to, from, next);
                }
            } else {
                next();
            }
        });
    });

    return function onRouterBeforeEach(callback: NavigationGuard) {
        const id = ++lastId;
        handlers.set(id, callback);
        onUnmounted(() => {
            handlers.delete(id);
        });
    };
})();

export function usePageLeaveConfirmation({
    askIf,
    customMessage,
}: {
    askIf: Ref<boolean>;
    customMessage?: string;
}): void {
    const message = customMessage ?? 'Changes you made may not be saved.';

    function beforeUnloadHandler(event: BeforeUnloadEvent) {
        // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onbeforeunload#example
        if (askIf.value) {
            event.preventDefault();
            event.returnValue = '';
        } else {
            delete event.returnValue;
        }
    }

    onMounted(() => {
        window.addEventListener('beforeunload', beforeUnloadHandler);
    });

    onBeforeUnmount(() => {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
    });

    function askForLeaveConfirmation() {
        if (askIf.value) {
            return window.confirm(i18n.t(message) as string);
        }
        return true;
    }

    onRouterBeforeEach((to, from, next) => {
        if (askForLeaveConfirmation()) {
            next();
        } else {
            next(false);
        }
    });
}
