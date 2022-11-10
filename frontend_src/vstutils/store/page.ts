import { ref, computed } from 'vue';
import { Model, ModelValidationError } from '../models';
import type { PageEditView, PageNewView, PageView, ActionView, Action, ListView } from '../views';
import { isInstancesEqual, RequestTypes, openPage, getApp } from '../utils';
import { i18n } from '../translation';
import { guiPopUp, pop_up_msg } from '../popUp';
import { Route } from 'vue-router';
import {
    useBasePageData,
    useQuerySet,
    useListFilters,
    useSelection,
    InstancesList,
    PAGE_WITH_INSTANCE,
    useInstanceTitle,
    useOperations,
    PAGE_WITH_EDITABLE_DATA,
    getRedirectUrl,
    createActionStore,
    useQueryBasedFiltering,
    useEntityViewClasses,
    usePageLeaveConfirmation,
    BaseViewStore,
} from './helpers';

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
    }) => {
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
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                unselect?.(instance.getPkValue());
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
    };

export const createListViewStore = (view: ListView) => () => {
    const base = useBasePageData(view);
    const qsStore = useQuerySet(view);
    const app = getApp();
    const { pagination, setQuery, filters } = useListFilters(qsStore.queryset);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const model = computed(() => view.objects.getResponseModelClass(RequestTypes.LIST));

    const instances = ref<InstancesList>([]);

    const selection = useSelection(instances);
    const isEmpty = computed(() => !instances.value.length);

    const instanceSublinks = computed(() => {
        if (view.pageView) {
            return Array.from(view.pageView.sublinks.values()).filter((sublink) => !sublink.hidden);
        }
        return [];
    });

    const instanceActions = computed(() => {
        if (view.pageView) {
            return Array.from(view.pageView.actions.values()).filter((action) => !action.hidden);
        }
        return [];
    });

    const multiActions = computed(() => Array.from(view.multiActions.values()));

    function setInstances(newInstances: InstancesList) {
        instances.value = newInstances;
        if (newInstances.extra?.count !== undefined) {
            pagination.count = newInstances.extra.count;
        }
    }
    function setInstancesCount(count: number) {
        pagination.count = count;
    }

    async function updateData() {
        const newInstances = (await qsStore.queryset.value.items()) as InstancesList;
        if (!isInstancesEqual(instances.value, newInstances)) {
            setInstances(newInstances);
        } else if (instances.value.extra?.count && pagination.count !== instances.value.extra.count) {
            setInstancesCount(instances.value.extra.count);
        }
    }

    function getQuery(): Route['query'] {
        const route = app.router.currentRoute;
        let query = route.query;

        let deepParentFilter: string | null = null;

        if (view.deepNestedParentView) {
            deepParentFilter = route.params[(view.parent! as PageView).pkParamName!];
        } else if (view.deepNestedView) {
            deepParentFilter = '';
        }

        if (deepParentFilter !== null) {
            query = { ...query, __deep_parent: deepParentFilter };
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
        purge: boolean;
    }) {
        const removedInstancesIds: (string | number)[] = [];
        try {
            await Promise.all(
                instances.map((instance) =>
                    instance.delete(purge).then(() => {
                        removedInstancesIds.push(instance.getPkValue() as string | number);
                    }),
                ),
            );
            guiPopUp.success(i18n.t(pop_up_msg.instance.success.removeMany) as string);
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const str = app.error_handler.errorToString(error) as string;
            const strToShow = i18n.t(pop_up_msg.instance.error.removeMany, [str]) as string;
            app.error_handler.showError(strToShow, str);
        }
        selection.unselectIds(removedInstancesIds);
    }

    return {
        ...base,
        ...qsStore,
        ...selection,
        ...useQueryBasedFiltering(),
        pagination,
        instances,
        isEmpty,
        model,
        instanceSublinks,
        instanceActions,
        multiActions,
        filters,
        setInstances,
        setInstancesCount,
        setQuery,
        updateData,
        fetchData,
        removeInstance: createRemoveInstance({
            pageView: view.pageView,
            unselect: (id) => selection.unselectIds([id]),
        }),
        removeInstances,
    };
};

export const createDetailViewStore = (view: PageView) => () => {
    const qsStore = useQuerySet(view);
    const pageWithInstance = PAGE_WITH_INSTANCE();
    const base = useBasePageData(view);
    const app = getApp();

    const title = useInstanceTitle({ view, instance: pageWithInstance.instance });
    /**
     * Contains toRepresent filters data
     */
    const filters = ref<Record<string, unknown>>({});
    const filtersQuery = ref<Record<string, unknown>>({});

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const model = ref<typeof Model>(view.objects.getResponseModelClass(RequestTypes.RETRIEVE));

    function getInstancePk(): string | number {
        if (pageWithInstance.instance.value) {
            return pageWithInstance.instance.value.getPkValue() as number | string;
        }
        return app.router.currentRoute.params[view.pkParamName!];
    }

    function getAutoUpdatePk() {
        return getInstancePk();
    }

    function populateFilters() {
        if (view.filtersModelClass) {
            const data = pageWithInstance.instance.value?._data;
            if (data) {
                const fields = view.filtersModelClass.fields;
                for (const key of Object.keys(data)) {
                    if (fields.has(key)) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                        filters.value[key] = fields.get(key).toRepresent(data);
                    }
                }
            }
        }
    }

    function setFilters(query: Record<string, unknown>) {
        if (view.filtersModelClass) {
            const instance = new view.filtersModelClass(query);
            filters.value = instance._getRepresentData();
            filtersQuery.value = instance._getInnerData();
        }
    }

    async function updateData(instancePk?: string | number) {
        const qs = qsStore.queryset.value;

        if (!instancePk) {
            instancePk = getInstancePk();
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const newInstance = await qs.filter(filtersQuery.value).get(instancePk);

        const instance = pageWithInstance.instance.value;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (!instance || !newInstance.isEqual(instance)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            (app.store.page as DetailPageStore).setInstance(newInstance);
            populateFilters();
        }
    }

    async function fetchData(instancePk?: string | number) {
        base.initLoading();
        setFilters(app.router.currentRoute.query);

        try {
            if (pageWithInstance.providedInstance.value) {
                pageWithInstance.setInstance(pageWithInstance.providedInstance.value);
            } else {
                await updateData(instancePk);
            }

            base.setLoadingSuccessful();
        } catch (error) {
            base.setLoadingError(error);
        }
    }

    function setFilterValue({ field, value }: { field: string; value: unknown }) {
        filters.value[field] = value;
    }

    function applyFilters() {
        if (view.filtersModelClass) {
            const query = view.filtersModelClass.representToInner(filters.value);
            return openPage({
                path: app.router.currentRoute.path,
                query: { ...app.router.currentRoute.query, ...query },
            });
        }
        return undefined;
    }

    return {
        ...base,
        ...qsStore,
        ...pageWithInstance,
        ...useOperations({ view, data: pageWithInstance.sandbox }),
        entityViewClasses: useEntityViewClasses(model, pageWithInstance.sandbox),
        model,
        title,
        filters,
        getInstancePk,
        getAutoUpdatePk,
        updateData,
        fetchData,
        removeInstance: createRemoveInstance({ pageView: view }),
        setFilterValue,
        applyFilters,
    };
};

export type DetailPageStore = BaseViewStore & {
    setInstance(instance: Model): void;
    instance: Model;
};

export const createNewViewStore = (view: PageNewView) => () => {
    const qsStore = useQuerySet(view);
    const pageWithEditableData = PAGE_WITH_EDITABLE_DATA(PAGE_WITH_INSTANCE());
    const base = useBasePageData(view);
    const app = getApp();

    usePageLeaveConfirmation({ askIf: pageWithEditableData.isPageChanged });

    const model = ref(view.objects.getResponseModelClass(RequestTypes.CREATE) as typeof Model);

    function fetchData({ data }: { data?: Record<string, any> } = { data: undefined }) {
        const queryset = qsStore.queryset.value;
        pageWithEditableData.setInstance(new model.value(model.value.getInitialData(data), queryset));
        base.setLoadingSuccessful();
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

            pageWithEditableData.changedFields.value = [];
            pageWithEditableData.fieldsErrors.value = {};

            guiPopUp.success(i18n.t(pop_up_msg.instance.success.save, [name, view.name]) as string);
            if (view.isDeepNested) {
                return openPage(getRedirectUrl());
            }
            return openPage({ path: getRedirectUrl(), params: { providedInstance } });
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
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

export const createEditViewStore = (view: PageEditView) => () => {
    const pageViewStore = PAGE_WITH_EDITABLE_DATA(createDetailViewStore(view as unknown as PageView)());

    usePageLeaveConfirmation({ askIf: pageViewStore.isPageChanged });

    const app = getApp();

    const model = ref(
        view.objects.getRequestModelClass(
            view.isPartial ? RequestTypes.PARTIAL_UPDATE : RequestTypes.UPDATE,
        ) as typeof Model,
    );

    function setInstance(instance: Model) {
        if (!(instance instanceof model.value)) {
            instance = new model.value(undefined, null, instance);
        }
        pageViewStore.setInstance(instance);
    }

    async function save() {
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
                (view as unknown as PageEditView).isPartial ? pageViewStore.changedFields.value : null,
            );

            pageViewStore.changedFields.value = [];
            pageViewStore.fieldsErrors.value = {};

            guiPopUp.success(i18n.t(pop_up_msg.instance.success.save, [name, view.name]) as string);
            if (view.isDeepNested) {
                return openPage(getRedirectUrl());
            }
            return openPage({ path: getRedirectUrl(), params: { providedInstance } });
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
            const modelValidationError = instance.parseModelError((error as any).data);
            if (modelValidationError) {
                pageViewStore.fieldsErrors.value = modelValidationError.toFieldsErrors();
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
        return pageViewStore.fetchData();
    }
    function cancel() {
        pageViewStore.changedFields.value = [];
        return app.router.back();
    }

    return { ...pageViewStore, model, setInstance, save, reload, cancel };
};

export const createActionViewStore = (view: ActionView) => () => {
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

    return {
        ...base,
        ...actionStore,
        ...useOperations({ view, data: actionStore.sandbox }),
        entityViewClasses: useEntityViewClasses(actionStore.model, actionStore.sandbox),
        execute,
    };
};
