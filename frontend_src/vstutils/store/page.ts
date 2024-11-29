import { computed, ref } from 'vue';

import { createInstancesList, ModelValidationError } from '#vstutils/models';
import { guiPopUp, pop_up_msg } from '#vstutils/popUp';
import { i18n } from '#vstutils/translation';
import { emptyInnerData } from '#vstutils/utils';
import { emitFilterListViewColumns } from '#vstutils/signals';
import { getApp, isInstancesEqual, openPage, RequestTypes } from '#vstutils/utils';
import { fetchInstances } from '#vstutils/fetch-values';
import {
    createActionStore,
    filterNonEmpty,
    getRedirectUrl,
    PAGE_WITH_EDITABLE_DATA,
    PAGE_WITH_INSTANCE,
    useBasePageData,
    useEntityViewClasses,
    useListFilters,
    useOperations,
    usePageLeaveConfirmation,
    usePagination,
    useQueryBasedFiltering,
    useQuerySet,
    useSelection,
} from './helpers';

import type { Route } from 'vue-router';
import type { InnerData, RepresentData } from '#vstutils/utils';
import type { Model, InstancesList } from '#vstutils/models';
import type { PageEditView, PageNewView, PageView, ActionView, Action, ListView } from '#vstutils/views';
import { filterOperationsBasedOnAvailabilityField } from '#vstutils/views/operations';
import type { PageViewStore } from './page-types';
export { innerDataMarker, representDataMarker } from './../utils/index';

const createRemoveInstance =
    ({ pageView, unselect }: { pageView?: PageView | null; unselect?: (id: string | number) => void }) =>
    async ({
        action,
        instance,
        fromList,
        purge,
    }: {
        action: Action;
        instance: Model;
        fromList?: boolean;
        purge?: boolean;
    }): Promise<Route | undefined> => {
        const app = getApp();
        try {
            if (!fromList) {
                app.store.page.stopAutoUpdate();
            }
            await instance.delete(purge);
            guiPopUp.success(
                i18n.t(pop_up_msg.instance.success.remove, [
                    instance.getViewFieldString() || instance.getPkValue(),
                    pageView ? i18n.t(pageView.title) : '',
                ]) as string,
            );
            if (fromList) {
                if (unselect) {
                    const pk = instance.getPkValue();
                    if (pk) {
                        unselect(pk);
                    }
                }
            } else {
                const route = app.router.currentRoute;
                return openPage(route.path.replace(/[^/]+\/?$/, ''));
            }
        } catch (error) {
            const str = app.error_handler.errorToString(error) as string;

            const srt_to_show = (i18n.t(pop_up_msg.instance.error.remove) as string).format([
                instance.getViewFieldValue() || instance.getPkValue(),
                pageView ? i18n.t(pageView.title) : '',
                str,
            ]);

            app.error_handler.showError(srt_to_show, str);
        }
        return Promise.resolve(undefined);
    };

export const createListViewStore = (view: ListView) => {
    const base = useBasePageData(view);
    const qsStore = useQuerySet(view);
    const app = getApp();
    const { count, pageNumber, pageSize, setQuery, filters } = useListFilters(qsStore.queryset);
    const paginationItems = usePagination({ count, page: pageNumber, size: pageSize });

    const model = computed(() => view.objects.getResponseModelClass(RequestTypes.LIST));

    const instances = ref<InstancesList>(createInstancesList([]));

    const selection = useSelection(instances);
    const isEmpty = computed(() => !instances.value.length);

    const instanceSublinks = computed(() => {
        if (view.pageView) {
            return Array.from(view.pageView.sublinks.values()).filter(
                (sublink) => !sublink.hidden && !sublink.doNotShowOnList,
            );
        }
        return [];
    });

    const instanceActions = computed(() => {
        if (view.pageView) {
            return Array.from(view.pageView.actions.values()).filter(
                (action) => !action.hidden && !action.doNotShowOnList,
            );
        }
        return [];
    });

    const multiActions = computed(() => Array.from(view.multiActions.values()));

    function setInstances(newInstances: InstancesList) {
        instances.value = newInstances;
        if (newInstances.extra?.count !== undefined) {
            count.value = newInstances.extra.count;
        }
    }

    async function updateData() {
        const newInstances = await qsStore.queryset.value.items();
        if (!isInstancesEqual(instances.value, newInstances)) {
            setInstances(newInstances);
        } else if (instances.value.extra?.count && count.value !== instances.value.extra.count) {
            count.value = instances.value.extra.count;
        }
    }

    function getQuery(): Route['query'] {
        const route = app.router.currentRoute;
        const query = { ...route.query };

        let deepParentFilter: string | null = null;

        if (view.deepNestedParentView) {
            deepParentFilter = route.params[(view.parent! as PageView).pkParamName!];
        } else if (view.deepNestedView) {
            deepParentFilter = '';
        }

        if (deepParentFilter !== null) {
            query.__deep_parent = deepParentFilter;
        }

        return query;
    }

    async function fetchData() {
        selection.setSelection([]);
        setQuery(getQuery());

        base.initLoading();
        try {
            await updateData();
            base.setLoadingSuccessful();
        } catch (error) {
            base.setLoadingError(error);
        }
    }

    async function removeInstances({
        action,
        instances,
        purge = false,
    }: {
        action: Action;
        instances: Model[];
        purge?: boolean;
    }) {
        const removedInstancesIds: (string | number)[] = [];
        try {
            await Promise.all(
                instances.map((instance) =>
                    instance.delete(purge).then(() => {
                        removedInstancesIds.push(instance.getPkValue()!);
                    }),
                ),
            );
            guiPopUp.success(i18n.t(pop_up_msg.instance.success.removeMany) as string);
        } catch (error) {
            const str = app.error_handler.errorToString(error) as string;
            const strToShow = i18n.ts(pop_up_msg.instance.error.removeMany, [str]) as string;
            app.error_handler.showError(strToShow, str);
        }
        selection.unselectIds(removedInstancesIds);
    }

    async function executeMultiAction(action: Action) {
        const selected = instances.value.filter((instance) =>
            selection.selection.value.includes(instance.getPkValue()!),
        );

        await app.actions.execute({ action, instances: selected });
    }

    const columns = computed(() => {
        return emitFilterListViewColumns(view.path, {
            filters: filters.value,
            columns: Array.from(model.value.fields.values()).filter((field) => !field.hidden),
        });
    });

    return {
        ...base,
        ...qsStore,
        ...selection,
        ...useQueryBasedFiltering(),
        count,
        pageNumber,
        pageSize,
        paginationItems,
        instances,
        isEmpty,
        model,
        instanceSublinks,
        instanceActions,
        multiActions,
        filters,
        columns,
        setInstances,
        setQuery,
        updateData,
        fetchData,
        removeInstance: createRemoveInstance({
            pageView: view.pageView,
            unselect: (id) => selection.unselectIds([id]),
        }),
        removeInstances,
        executeMultiAction,
    };
};

export const createDetailViewStore = (view: PageView) => {
    const qsStore = useQuerySet(view);
    const pageWithInstance = PAGE_WITH_INSTANCE(view);
    const base = useBasePageData(view);
    const app = getApp();

    const filtersQuery = ref(emptyInnerData());

    function getInstancePk(): string | number | undefined | null {
        if (pageWithInstance.instance.value) {
            return pageWithInstance.instance.value.getPkValue()!;
        }
        return app.router.currentRoute.params[view.pkParamName!];
    }

    function getAutoUpdatePk() {
        return getInstancePk() ?? undefined;
    }

    /**
     * Returns filter names and their default values got from backend.
     */
    const filtersDefaults = computed(() => {
        if (!view.filtersModelClass) {
            return {};
        }
        const rawQuery = pageWithInstance.instance.value?._response?.headers['X-Query-Data'] ?? '';
        return Object.fromEntries(new URLSearchParams(rawQuery).entries());
    });

    const filters = computed(() => {
        if (!view.filtersModelClass) {
            return undefined;
        }
        return {
            ...filtersDefaults.value,
            ...filtersQuery.value,
        };
    });

    const appliedDefaultFilterNames = computed(() => {
        if (!view.filtersModelClass) {
            return [];
        }
        return Object.keys(filtersDefaults.value).filter((name) => filtersQuery.value[name] === undefined);
    });

    function setFilters(query: Record<string, unknown>) {
        if (view.filtersModelClass) {
            const instance = new view.filtersModelClass(query as InnerData);
            filtersQuery.value = instance._getInnerData();
        }
    }

    async function updateData(instancePk?: string | number, { forceSet = false } = {}) {
        const qs = qsStore.queryset.value;

        if (!instancePk) {
            instancePk = getInstancePk()!;
        }
        const newInstance = await qs.filter(filtersQuery.value).get(instancePk);

        const instance = pageWithInstance.instance.value;
        if (forceSet || !instance || !newInstance.isEqual(instance)) {
            (app.store.page as PageViewStore).setInstance(newInstance);
        }
    }

    async function fetchData({
        instancePk,
        forceSet = false,
    }: { instancePk?: string | number; forceSet?: boolean } = {}) {
        base.initLoading();
        setFilters(app.router.currentRoute.query);

        try {
            if (pageWithInstance.providedInstance.value) {
                const instance = pageWithInstance.providedInstance.value;
                await fetchInstances([instance]);
                pageWithInstance.setInstance(instance);
            } else {
                await updateData(instancePk, { forceSet });
            }

            base.setLoadingSuccessful();
        } catch (error) {
            base.setLoadingError(error);
        }
    }

    function applyFilters(newFilters: RepresentData) {
        if (view.filtersModelClass) {
            const query = filterNonEmpty(view.filtersModelClass.representToInner(newFilters));
            return openPage({
                path: app.router.currentRoute.path,
                query,
            }) as Promise<void>;
        }
        return Promise.resolve();
    }

    const operations = useOperations({ view, data: pageWithInstance.sandbox });

    const actions = computed(() => {
        return filterOperationsBasedOnAvailabilityField(
            operations.actions.value,
            pageWithInstance.sandbox.value,
            view.params['x-detail-operations-availability-field-name'],
        );
    });

    const sublinks = computed(() => {
        return filterOperationsBasedOnAvailabilityField(
            operations.sublinks.value,
            pageWithInstance.sandbox.value,
            view.params['x-detail-operations-availability-field-name'],
        );
    });

    return {
        ...base,
        ...qsStore,
        ...pageWithInstance,
        actions,
        sublinks,
        entityViewClasses: useEntityViewClasses(pageWithInstance.model, pageWithInstance.sandbox),
        filtersQuery,
        filters,
        appliedDefaultFilterNames,
        getInstancePk,
        getAutoUpdatePk,
        updateData,
        fetchData,
        removeInstance: createRemoveInstance({ pageView: view }),
        applyFilters,
    };
};

export const createNewViewStore = (view: PageNewView) => {
    const qsStore = useQuerySet(view);
    const pageWithEditableData = PAGE_WITH_EDITABLE_DATA(PAGE_WITH_INSTANCE(view));
    const base = useBasePageData(view);
    const app = getApp();

    usePageLeaveConfirmation({ askIf: pageWithEditableData.isPageChanged });

    const model = ref(view.objects.getResponseModelClass(RequestTypes.CREATE));

    function fetchData({ data }: { data?: InnerData } = { data: undefined }) {
        const queryset = qsStore.queryset.value;
        pageWithEditableData.setInstance(new model.value(model.value.getInitialData(data), queryset));
        base.setLoadingSuccessful();
        return Promise.resolve();
    }
    async function save() {
        try {
            pageWithEditableData.validateAndSetInstanceData();
        } catch (e) {
            app.error_handler.defineErrorAndShow(e);
            if (e instanceof ModelValidationError) {
                pageWithEditableData.fieldsErrors.value = e.toFieldsErrors();
            }
            return;
        }
        const instance = pageWithEditableData.instance.value;
        if (!instance) {
            return;
        }
        base.loading.value = true;
        const name = instance.getViewFieldString() || (instance.getPkValue() as number) || '';
        try {
            const method = view.params.method;

            const providedInstance = await instance.create(method);

            pageWithEditableData.instance.value!.sandbox.markUnchanged();
            pageWithEditableData.fieldsErrors.value = {};

            guiPopUp.success(i18n.t(pop_up_msg.instance.success.save, [name, view.name]) as string);
            if (view.isDeepNested) {
                return openPage(getRedirectUrl()) as Promise<void>;
            }
            return openPage({ path: getRedirectUrl(), params: { providedInstance } }) as Promise<void>;
        } catch (error) {
            const modelValidationError = instance.parseModelError((error as any).data);
            if (modelValidationError) {
                pageWithEditableData.fieldsErrors.value = modelValidationError.toFieldsErrors();
            }
            app.error_handler.showError(
                i18n.t(pop_up_msg.instance.error.create, [
                    app.error_handler.errorToString(modelValidationError || error),
                ]) as string,
            );
        } finally {
            base.loading.value = false;
        }
    }

    return {
        ...base,
        ...qsStore,
        ...pageWithEditableData,
        ...useOperations({ view, data: pageWithEditableData.sandbox }),
        entityViewClasses: useEntityViewClasses(model, pageWithEditableData.sandbox),
        model,
        fetchData,
        save,
    };
};

export const createEditViewStore = (view: PageEditView) => {
    const pageViewStore = PAGE_WITH_EDITABLE_DATA(createDetailViewStore(view as unknown as PageView));

    usePageLeaveConfirmation({ askIf: pageViewStore.isPageChanged });

    const app = getApp();

    function setInstance(instance: Model) {
        if (!(instance instanceof pageViewStore.model.value)) {
            instance = new pageViewStore.model.value(undefined, null, instance);
        }
        pageViewStore.setInstance(instance);
    }

    async function save(opts?: { ignoreEtag?: boolean; allFields?: boolean }): Promise<void> {
        try {
            pageViewStore.validateAndSetInstanceData();
        } catch (e) {
            app.error_handler.defineErrorAndShow(e);
            if (e instanceof ModelValidationError) {
                pageViewStore.fieldsErrors.value = e.toFieldsErrors();
            }
            return;
        }
        const instance = pageViewStore.instance.value;
        if (!instance) {
            return;
        }
        pageViewStore.loading.value = true;
        const name = instance.getViewFieldString() || (instance.getPkValue() as number) || '';
        try {
            const method = view.params.method;

            const providedInstance = await instance.update(
                method,
                (view as unknown as PageEditView).isPartial && !opts?.allFields
                    ? Array.from(pageViewStore.instance.value!.sandbox.changedFields)
                    : undefined,
                opts?.ignoreEtag,
            );

            instance.sandbox.markUnchanged();
            pageViewStore.fieldsErrors.value = {};

            guiPopUp.success(i18n.t(pop_up_msg.instance.success.save, [name, view.name]) as string);
            if (view.isDeepNested) {
                return openPage(getRedirectUrl()) as Promise<void>;
            }
            return openPage({ path: getRedirectUrl(), params: { providedInstance } }) as Promise<void>;
        } catch (error) {
            const modelValidationError = instance.parseModelError((error as any).data);
            if (modelValidationError) {
                pageViewStore.fieldsErrors.value = modelValidationError.toFieldsErrors();
            } else if (error && typeof error === 'object' && 'status' in error && error.status === 412) {
                const override = confirm(
                    i18n.ts('The data has been changed on the server. Do you want to overwrite it?'),
                );
                if (override) {
                    return save({ ignoreEtag: true, allFields: true });
                } else {
                    return;
                }
            }
            app.error_handler.showError(
                i18n.t(pop_up_msg.instance.error.save, [
                    app.error_handler.errorToString(modelValidationError || error),
                ]) as string,
            );
        } finally {
            pageViewStore.loading.value = false;
        }
    }

    function reload() {
        return pageViewStore.fetchData({ forceSet: true });
    }
    function cancel() {
        pageViewStore.instance.value!.sandbox.markUnchanged();
        app.router.back();
    }

    return { ...pageViewStore, setInstance, save, reload, cancel };
};

export const createActionViewStore = (view: ActionView) => {
    const base = useBasePageData(view);
    const actionStore = createActionStore(view);

    usePageLeaveConfirmation({ askIf: actionStore.isPageChanged });

    async function execute() {
        base.initLoading();
        try {
            return await actionStore.execute();
        } finally {
            base.setLoadingSuccessful();
        }
    }

    base.setLoadingSuccessful();

    function fetchData() {
        actionStore.init();
    }

    return {
        ...base,
        ...actionStore,
        ...useOperations({ view, data: actionStore.sandbox }),
        entityViewClasses: useEntityViewClasses(actionStore.model, actionStore.sandbox),
        execute,
        fetchData,
    };
};
