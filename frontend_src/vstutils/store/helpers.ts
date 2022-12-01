import { defineStore, StoreGeneric } from 'pinia';
import {
    computed,
    del,
    onBeforeUnmount,
    onMounted,
    onUnmounted,
    reactive,
    ref,
    Ref,
    set,
    shallowReadonly,
    shallowRef,
    watch,
} from 'vue';

import { APIResponse } from '@/vstutils/api';
import { useAutoUpdate } from '@/vstutils/autoupdate';
import { useBreadcrumbs } from '@/vstutils/breadcrumbs';
import { Model, ModelValidationError } from '@/vstutils/models';
import signals from '@/vstutils/signals';
import { i18n } from '@/vstutils/translation';
import {
    classesFromFields,
    getApp,
    getRedirectUrlFromResponse,
    getUniqueId,
    IGNORED_FILTERS,
    joinPaths,
    makeQueryString,
    mergeDeep,
    openPage,
    pathToArray,
} from '@/vstutils/utils';

import type { QuerySet } from '../querySet';
import type { IView, ActionView, NotEmptyAction } from '../views';
import type { NavigationGuard, Route } from 'vue-router';
import type { IApp } from '@/vstutils/app';

export function useParentViews() {
    interface Item {
        view: IView;
        state: unknown;
        path: string;
    }

    const items = ref<Item[]>([]);
    const itemsMap = computed(() => new Map(items.value.map((item) => [item.view.path, item])));

    async function push(store: BaseViewStore): Promise<void> {
        const view = store.view;
        const router = getApp().router;
        const path = router.currentRoute.path;

        const promises: Promise<Item>[] = [];

        const dt = pathToArray(path);
        // Iterate all available pathes except last. For example page
        // with url /1/2/3/4/ will iterate over pathes /1/, /1/2/, /1/2/3/
        for (let idx = 0; idx < dt.length - 1; idx++) {
            const resolved = router.resolve(joinPaths(...dt.slice(0, idx + 1)));

            // Use already resolved state if exists
            if (resolved.route.fullPath === items.value[idx]?.path) {
                promises.push(Promise.resolve(items.value[idx]) as Promise<Item>);
                continue;
            }

            const resolvedView = resolved.route.meta?.view as IView | undefined;
            if (resolvedView) {
                promises.push(
                    resolvedView
                        .resolveState({ route: resolved.route })
                        .catch((error) => {
                            console.warn(`Error while resolving view "${view.path}" state`, error);
                        })
                        .then((state) => ({ view: resolvedView, path: resolved.route.path, state })),
                );
            }
        }

        // Last element is always current page so we can use store to resolve state
        promises.push(
            view
                .resolveState({ route: router.currentRoute, store })
                .catch((error) => {
                    console.warn(`Error while resolving view "${view.path}" state`, error);
                })
                .then((state) => ({ view, path, state })),
        );

        items.value = await Promise.all(promises);
    }

    return {
        items: shallowReadonly(items),
        itemsMap,
        push,
    };
}

export function useModelSandbox(instance: Ref<Model | null>) {
    const sandbox = ref<Record<string, unknown>>({});

    function setFieldValue({ field, value }: { field: string; value: unknown }) {
        set(sandbox.value, field, value);
    }

    watch(
        instance,
        (newInstance) => {
            sandbox.value = newInstance ? newInstance._getRepresentData() : {};
        },
        { immediate: true },
    );

    return { sandbox, setFieldValue };
}

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

export const useInstanceTitle = ({ view, instance }: { view: IView; instance: Ref<Model | null> }) => {
    return computed(() => {
        if (view.isDetailPage() && view.useViewFieldAsTitle) {
            return instance.value?.getViewFieldString(false) || i18n.st(view.title);
        }
        return i18n.st(view.title);
    });
};

export const useQuerySet = (view: IView) => {
    if (!view.objects) {
        throw new Error(`View ${view.path} has no queryset`);
    }
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
    view: IView;
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

export const useBasePageData = (view: IView) => {
    const loading = ref(false);
    const error = ref<unknown>(null);
    const response = ref<unknown>(null);
    const title = computed<string>(() => {
        return i18n.st(view.title);
    });
    const breadcrumbs = useBreadcrumbs();

    const {
        start: startAutoUpdate,
        stop: stopAutoUpdate,
        setCallback: setAutoUpdateCallback,
        setPk: setAutoUpdatePk,
    } = useAutoUpdate({
        callback: () =>
            getApp().store.page.updateData?.() ??
            Promise.reject(
                `Please provide auto update callback or disable auto update for view ${view.path}`,
            ),
        pk: () => getApp().store.page.getAutoUpdatePk?.(),
        labels: view.subscriptionLabels || undefined,
        startOnMount: view.autoupdate,
    });

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
        startAutoUpdate,
        stopAutoUpdate,
        setAutoUpdateCallback,
        setAutoUpdatePk,
    };
};

export type BaseViewStore = StoreGeneric & {
    readonly view: IView;
    readonly title: string;
    fetchData?: () => Promise<void>;
    updateData?: () => Promise<void>;
    getAutoUpdatePk?: () => string | number;
    entityViewClasses?: string[];
    getStateToSave?(): unknown;
    startAutoUpdate(): void;
    stopAutoUpdate(): void;
    setAutoUpdateCallback(callback: Promise<unknown>): void;
    setAutoUpdatePk(pk: number | string): void;
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
    return Object.fromEntries(Object.entries(obj).filter(([key, value]) => value || key === '__deep_parent'));
}

export function useListFilters(qs: Ref<QuerySet>) {
    const app = getApp();
    const count = ref(0);
    const pageSize = ref(app.config.defaultPageLimit);
    const pageNumber = ref(1);
    const filters = ref<Record<string, any>>({});

    function setQuery(query: Record<string, any>) {
        query = filterNonEmpty(query);
        const limit = pageSize.value;
        const page = Number(query.page) || 1;
        filters.value = query;
        pageNumber.value = page;
        qs.value = qs.value.clone({
            query: mergeDeep({ limit, offset: limit * (page - 1) }, query),
        });
    }

    return { count, pageSize, pageNumber, filters, setQuery };
}

export interface PaginationItem {
    page?: number;
    text?: string;
    disabled?: boolean;
    icon?: string;
    onClick?: () => void;
}

export function usePagination({
    count,
    page,
    size,
}: {
    count: Ref<number>;
    page: Ref<number>;
    size: Ref<number>;
}) {
    const virtualPage = ref(0);
    const buttonsAmount = ref(3);

    watch(page, (page) => (virtualPage.value = page));

    const pagesAmount = computed(() => {
        const amount = Math.ceil(count.value / size.value);
        return Number.isFinite(amount) ? amount : 1;
    });

    const browseBackActive = computed(() => virtualPage.value > 1);
    const browseForwardActive = computed(() => virtualPage.value < pagesAmount.value);

    function browseBack() {
        if (browseBackActive.value) {
            virtualPage.value -= 1;
        }
    }

    function browseForward() {
        if (browseForwardActive.value) {
            virtualPage.value += 1;
        }
    }

    const items = computed<PaginationItem[]>(() => {
        const totalAmount = buttonsAmount.value * 2;

        if (pagesAmount.value <= totalAmount) {
            const arr: PaginationItem[] = [];
            for (let num = 1; num <= pagesAmount.value; num++) {
                arr.push({ page: num, text: num.toString(), disabled: page.value === num });
            }
            return arr;
        }

        const start = Math.max(1, virtualPage.value - buttonsAmount.value);
        const end = Math.min(virtualPage.value + (totalAmount - buttonsAmount.value), pagesAmount.value);

        const arr: PaginationItem[] = [
            { page: 1, icon: 'fas fa-angle-double-left', disabled: page.value === 1 },
            { icon: 'fas fa-angle-left', onClick: browseBack, disabled: !browseBackActive.value },
        ];
        for (let num = start; num <= end; num++) {
            arr.push({ page: num, text: num.toString(), disabled: page.value === num });
        }
        arr.push(
            { icon: 'fas fa-angle-right', onClick: browseForward, disabled: !browseForwardActive.value },
            {
                page: pagesAmount.value,
                icon: 'fas fa-angle-double-right',
                disabled: page.value === pagesAmount.value,
            },
        );

        return arr;
    });

    return items;
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
    const { sandbox, setFieldValue } = useModelSandbox(instance);
    const providedInstance = computed<Model | undefined>(
        () => app.rootVm.$route.params.providedInstance as unknown as Model | undefined,
    );

    function setInstance(newInstance: Model) {
        instance.value = newInstance;
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

    function setFieldValue({
        field,
        value,
        markChanged = true,
    }: {
        field: string;
        value: unknown;
        markChanged: boolean;
    }) {
        del(fieldsErrors.value, field);
        if (markChanged && !changedFields.value.includes(field)) {
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

export function useViewStore<T extends IView>(view: T) {
    const app = getApp();
    const store = defineStore(`page_${getUniqueId()}`, view.getStoreDefinition())() as BaseViewStore;
    if (store.fetchData) {
        void store.fetchData();
    }

    void app.store.setPage(store);

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
