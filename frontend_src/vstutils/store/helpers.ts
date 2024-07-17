import { getActivePinia } from 'pinia';
import {
    computed,
    del,
    getCurrentInstance,
    onBeforeUnmount,
    onMounted,
    onScopeDispose,
    onUnmounted,
    provide,
    ref,
    shallowReadonly,
    shallowRef,
    toRef,
    watch,
} from 'vue';

import { useAutoUpdate } from '@/vstutils/autoupdate';
import { useBreadcrumbs } from '@/vstutils/breadcrumbs';
import { ModelValidationError } from '@/vstutils/models';
import { filterOperations, signals } from '@/vstutils/signals';
import { i18n } from '@/vstutils/translation';
import { useRoute } from 'vue-router/composables';
import {
    getApp,
    getRedirectUrlFromResponse,
    IGNORED_FILTERS,
    joinPaths,
    makeQueryString,
    mergeDeep,
    openPage,
    pathToArray,
    emptyRepresentData,
    emptyInnerData,
    classesFromFields,
} from '@/vstutils/utils';

import type { Ref } from 'vue';
import type { NavigationGuard, Route } from 'vue-router';
import type { QuerySet } from '@/vstutils/querySet';
import type { IView, ActionView, NotEmptyAction, ViewStore, DetailView } from '@/vstutils/views';
import type { Model, ModelConstructor } from '@/vstutils/models';
import type { IApp } from '@/vstutils/app';
import type { RepresentData, InnerData } from '@/vstutils/utils';
import type { BaseViewStore } from './page-types';
import type { SetFieldValueOptions } from '../fields/base';

export function useParentViews(params?: { getPath?: () => string }) {
    interface Item {
        view: IView;
        state: unknown;
        path: string;
    }

    const items = ref<Item[]>([]);
    const itemsMap = computed(() => new Map(items.value.map((item) => [item.view.path, item])));

    const getPath = params?.getPath ?? (() => getApp().router.currentRoute.path);

    async function push(store: BaseViewStore): Promise<void> {
        const view = store.view;
        const router = getApp().router;
        const path = getPath();

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

export function getRedirectUrl(): string {
    const url = getApp()
        .router.currentRoute.path.replace(/\/edit\/?$/, '')
        .replace(/\/new\/?$/, '');
    return url;
}

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

export const useEntityViewClasses = (modelClass: Ref<ModelConstructor>, data: Ref<RepresentData>) => {
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
    data?: Ref<RepresentData>;
    isListItem?: boolean;
}) => {
    const actions = computed(() => {
        return filterOperations('actions', Array.from(view.actions.values()), data?.value, isListItem);
    });
    const sublinks = computed(() => {
        return filterOperations('sublinks', Array.from(view.sublinks.values()), data?.value, isListItem);
    });

    return { actions, sublinks };
};

export const useBasePageData = (view: IView) => {
    const loading = ref(false);
    const error = ref<unknown>(null);
    const response = ref<unknown>(null);
    const title = computed<string>(() => view.getTitle(view.getSavedState()));
    const breadcrumbs = useBreadcrumbs();
    const app = getApp();

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
        return Promise.resolve();
    }

    function executeMainAction() {
        if (view.mainAction) {
            const action = view.actions.get(view.mainAction);
            if (action) {
                void app.actions.execute({
                    action,
                    instance: app.store.page.instance as Model | undefined,
                });
            }
        }
    }

    return {
        ...useOperations({ view, isListItem: false }),
        view: ref(view),
        loading,
        error,
        response,
        title,
        breadcrumbs,
        initLoading,
        setLoadingSuccessful,
        setLoadingError,
        fetchData,
        startAutoUpdate,
        stopAutoUpdate,
        setAutoUpdateCallback,
        setAutoUpdatePk,
        executeMainAction,
    };
};

export const useSelection = (instances: Ref<Model[]>) => {
    const selection = ref<(number | string)[]>([]);

    const allSelected = computed(() =>
        instances.value.every((instance) => selection.value.includes(instance.getPkValue()!)),
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
    const pageSize = ref(app.defaultPageLimit);
    const pageNumber = ref(1);
    const filters = ref<InnerData>(emptyInnerData());

    function setQuery(query: Record<string, any>) {
        query = filterNonEmpty(query);
        const limit = pageSize.value;
        const page = Number(query.page) || 1;
        filters.value = query as InnerData;
        pageNumber.value = page;
        qs.value = qs.value.clone({
            query: mergeDeep({ limit, offset: limit * (page - 1) }, query) as Record<string, unknown>,
        });
    }

    return { count, pageSize, pageNumber, filters, setQuery };
}

export interface PaginationItem {
    page?: number;
    text?: string;
    disabled?: boolean;
    icon?: string | string[];
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

export const PAGE_WITH_INSTANCE = (view: DetailView) => {
    const app = getApp();

    const instance = shallowRef<Model | null>(null);
    const sandbox = computed(() => instance.value?.sandbox.value ?? emptyRepresentData());
    const providedInstance = computed<Model | undefined>(
        () => app.rootVm.$route.params.providedInstance as unknown as Model | undefined,
    );

    const model = computed(() => {
        return view.getModel();
    });

    const fieldsGroups = computed(() => {
        return view.getFieldsGroups({ data: sandbox.value });
    });

    function setInstance(newInstance: Model) {
        instance.value = newInstance;
    }

    function setFieldValue(options: SetFieldValueOptions) {
        instance.value?.sandbox.set(options);
    }

    return { instance, sandbox, providedInstance, setInstance, setFieldValue, fieldsGroups, model };
};

export const PAGE_WITH_EDITABLE_DATA = <T extends ReturnType<typeof PAGE_WITH_INSTANCE>>(base: T) => {
    const fieldsErrors = ref<Record<string, any>>({});
    const changedFields = computed(() => base.instance.value?.sandbox.changedFields);
    const isPageChanged = computed(() => base.instance.value?.sandbox.changed ?? false);

    function validateAndSetInstanceData() {
        base.instance.value!._validateAndSetData();
    }

    function setFieldValue(options: SetFieldValueOptions) {
        del(fieldsErrors.value, options.field);
        base.setFieldValue(options);
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
    const pageWithEditableData = PAGE_WITH_EDITABLE_DATA(PAGE_WITH_INSTANCE(view));

    const app = getApp();

    async function execute() {
        try {
            const executeAction = view.actions.get('execute') as NotEmptyAction;
            const response = await app.actions.executeWithData({
                action: executeAction,
                instance: pageWithEditableData.instance.value!,
                method: view.method,
                path: view.getRequestPath(app.router.currentRoute),
                throwError: true,
                auth: view.isSecure,
            });
            pageWithEditableData.instance.value!.sandbox.markUnchanged();
            pageWithEditableData.fieldsErrors.value = {};
            if (executeAction.redirectPath) {
                void openPage(
                    typeof executeAction.redirectPath === 'function'
                        ? executeAction.redirectPath()
                        : executeAction.redirectPath,
                );
            } else {
                void openPage(
                    getRedirectUrlFromResponse(response?.data, view.action.responseModel) ??
                        view.getRedirectUrl(app.router.currentRoute),
                );
            }
        } catch (e) {
            if (e instanceof ModelValidationError) {
                pageWithEditableData.fieldsErrors.value = e.toFieldsErrors();
            } else {
                console.warn(e);
            }
        }
    }

    pageWithEditableData.setInstance(new pageWithEditableData.model.value());

    return {
        ...pageWithEditableData,
        execute,
    };
};

/**
 * @internal
 */
export async function createViewStore<T extends IView>(
    view: T,
    options: { watchQuery?: boolean } = {},
): Promise<ViewStore<T>> {
    const app = getApp();
    const route = useRoute();
    const store = view._createStore() as ViewStore<T>;

    provide('view', view);

    if (options.watchQuery) {
        watch(toRef(route, 'query'), () => {
            void store.fetchData();
        });
    }

    onScopeDispose(() => {
        store.$dispose();
        const pinia = getActivePinia();
        if (pinia) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete pinia.state.value[store.$id];
        }
    });

    try {
        await app.store.setPage(store);
        // eslint-disable-next-line no-empty
    } catch {}

    try {
        await store.fetchData();
        // eslint-disable-next-line no-empty
    } catch {}

    return store;
}

export function useViewStore<T extends IView>(): ViewStore<T> {
    return getApp().store.page as ViewStore<T>;
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
        (getCurrentInstance() ? onUnmounted : onScopeDispose)(() => {
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

    if (getCurrentInstance()) {
        onMounted(() => {
            window.addEventListener('beforeunload', beforeUnloadHandler);
        });

        onBeforeUnmount(() => {
            window.removeEventListener('beforeunload', beforeUnloadHandler);
        });
    }

    function askForLeaveConfirmation() {
        if (askIf.value) {
            return window.confirm(i18n.ts(message));
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
