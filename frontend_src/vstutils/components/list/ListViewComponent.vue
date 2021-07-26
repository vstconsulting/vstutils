<template>
    <EntityView
        :error="error"
        :loading="loading"
        :response="response"
        :title="title"
        :view="view"
        :actions="actions"
        :sublinks="sublinks"
        :show-back-button="showBackButton"
        @execute-action="executeAction"
        @open-sublink="openSublink"
    >
        <template #additionalTitleInfo>
            <span v-if="!error && totalNumberOfInstances > -1" class="badge bg-info">
                {{ totalNumberOfInstances }}
            </span>
        </template>
        <div class="list-content-component" :class="`list-${model.name}`">
            <template v-if="isEmpty">
                <p class="text-center empty-list-p">
                    {{ $t('list is empty') | capitalize }}
                </p>
            </template>
            <template v-else>
                <ListTable
                    :instances="instances"
                    :selection="selection"
                    :fields="fields"
                    :has-multi-actions="view.multiActions.size > 0"
                    :instance-actions="instanceActions"
                    :instance-sublinks="instanceSublinks"
                    @row-clicked="openPageView"
                    @execute-instance-action="({ action, instance }) => executeAction(action, instance)"
                    @open-instance-sublink="({ sublink, instance }) => openSublink(sublink, instance)"
                    @toggle-selection="toggleSelection"
                    @toggle-all-selection="toggleAllSelection"
                />
                <div class="list-footer-btns-wrapper">
                    <transition name="slide-from-left">
                        <MultiActions
                            v-if="multiActions.length && selection.length"
                            :multi-actions="multiActions"
                            :number-of-selected="selection.length"
                            @execute-multi-action="executeMultiAction"
                        />
                    </transition>
                    <Pagination v-bind="pagination" style="float: right" @open-page="goToPage" />
                </div>
            </template>
        </div>
    </EntityView>
</template>

<script>
    import ViewWithAutoUpdateMixin from '../../views/mixins/ViewWithAutoUpdateMixin.js';
    import $ from 'jquery';
    import { guiPopUp, pop_up_msg } from '../../popUp';
    import EntityView from '../common/EntityView.vue';
    import ListTable from './ListTable.vue';
    import MultiActions from './MultiActions.vue';
    import Pagination from './Pagination.vue';
    import { formatPath, IGNORED_FILTERS, joinPaths, makeQueryString, RequestTypes } from '../../utils';
    import { BaseViewMixin } from '../BaseViewMixin.js';

    export default {
        components: { Pagination, MultiActions, ListTable, EntityView },
        mixins: [BaseViewMixin, ViewWithAutoUpdateMixin],
        computed: {
            isEmpty() {
                return !this.instances || (this.instances && !this.instances.length);
            },
            showBackButton() {
                return true;
            },
            model() {
                return this.view.objects.getResponseModelClass(RequestTypes.LIST);
            },
            /**
             * Property that returns total number total number of instances, or -1 if
             * instances has no count
             * @returns {number}
             */
            totalNumberOfInstances() {
                const count = this.instances?.extra?.count;
                return count === undefined ? -1 : count;
            },
            fields() {
                return Array.from(this.model.fields.values()).filter((field) => !field.hidden);
            },
            filters() {
                return this.$store.getters[this.storeName + '/filters'];
            },
            instances() {
                return this.$store.getters[this.storeName + '/instances'];
            },
            selection() {
                return this.$store.getters[this.storeName + '/selection'];
            },
            pagination() {
                return this.$store.getters[this.storeName + '/pagination'];
            },
            instanceActions() {
                if (this.view.pageView) {
                    return Array.from(this.view.pageView.actions.values()).filter(
                        (action) => !action.doNotShowOnList,
                    );
                }
                return [];
            },
            instanceSublinks() {
                if (this.view.pageView) {
                    return Array.from(this.view.pageView.sublinks.values());
                }
                return [];
            },
            multiActions() {
                return Array.from(this.view.multiActions.values());
            },
        },
        methods: {
            /**
             * Redefinition of 'onCreatedHandler()' from base mixin.
             */
            onCreatedHandler() {
                this.fetchData();
            },
            /**
             * Redefinition of 'fetchData()' from base mixin.
             */
            async fetchData() {
                this.commitMutation('setSelection', []);

                this.initLoading();

                try {
                    await this.dispatchAction('fetchData', { filters: this.generateBaseFilters() });

                    this.setLoadingSuccessful();
                    if (this.view.params.autoupdate) {
                        this.startAutoUpdate();
                    }
                } catch (error) {
                    this.setLoadingError(error);
                }
            },
            filterNonEmpty(obj) {
                return Object.fromEntries(Object.entries(obj).filter((entry) => entry[1]));
            },
            /**
             * Method, that generates object
             * with values of base list QuerySet filters(limit, offset).
             * @return {object}
             */
            generateBaseFilters() {
                const limit = this.pagination.pageSize || this.$app.config.defaultPageLimit;
                const page = this.$route.query.page || 1;
                const query = { limit, offset: limit * (page - 1) };
                if (this.view.deepNestedParentView) {
                    query.__deep_parent = this.params[this.view.parent.pkParamName];
                } else if (this.view.deepNestedView) {
                    query.__deep_parent = '';
                }
                return $.extend(true, query, this.filterNonEmpty(this.$route.query));
            },
            applyFilters(filters) {
                this.commitMutation('setFilters', this.filterNonEmpty(filters));
                this.filterInstances();
            },
            /**
             * Method, that returns object with values of QuerySet filters from store.
             * @return {object}
             */
            getFiltersPrepared() {
                return Object.fromEntries(
                    Object.keys(this.filters)
                        .filter((name) => this.filters[name] !== undefined)
                        .map((name) => [name, this.filters[name]]),
                );
            },
            /**
             * Method, that handles 'filterInstances' event.
             * Method opens page, that satisfies current filters values.
             */
            filterInstances() {
                let filters = this.getFiltersPrepared();

                for (let filter in filters) {
                    if (IGNORED_FILTERS.includes(filter)) {
                        delete filters[filter];
                    }
                }

                return this.openPage(this.$route.path + makeQueryString(filters));
            },
            /**
             * Removes one instance
             * @param action
             * @param {Model} instance
             * @returns {Promise<void>}
             * @private
             */
            async removeInstance(action, instance) {
                try {
                    await instance.delete();
                    guiPopUp.success(
                        this.$t(pop_up_msg.instance.success.remove).format([
                            instance.getViewFieldString() || instance.getPkValue(),
                            this.$t(this.view.name),
                        ]),
                    );
                    this.commitMutation('unselectIds', [instance.getPkValue()]);
                } catch (error) {
                    const str = window.app.error_handler.errorToString(error);
                    const strToShow = this.$t(pop_up_msg.instance.error.removeMany).format([
                        instance.getViewFieldValue(),
                        this.$t(this.view.name),
                        str,
                    ]);

                    window.app.error_handler.showError(strToShow, str);
                }
            },
            /**
             * Method, that removes instances from list.
             * @returns {Promise}
             */
            async removeInstances(action, instances) {
                try {
                    await Promise.all(instances.map((instance) => instance.delete()));
                    guiPopUp.success(
                        this.$t(pop_up_msg.instance.success.removeMany).format([
                            instances.length,
                            instances[0]?.getViewFieldString(),
                        ]),
                    );
                    this.commitMutation(
                        'unselectIds',
                        instances.map((instance) => instance.getPkValue()),
                    );
                } catch (error) {
                    const str = window.app.error_handler.errorToString(error);
                    const strToShow = this.$t(pop_up_msg.instance.error.removeMany).format([
                        instances[0]._name,
                        str,
                    ]);
                    window.app.error_handler.showError(strToShow, str);
                }
            },
            executeEmptyActionOnInstances(action) {
                const selected = this.instances.filter((instance) =>
                    this.selection.includes(instance.getPkValue()),
                );

                for (let instance of selected) this.executeEmptyAction(action, instance);
            },

            /**
             * Method, that adds child instance to parent list.
             * @param {object} opt
             */
            async addChildInstance(opt) {
                let qs = this.getQuerySet(this.view, this.qs_url);
                try {
                    await qs.execute({ method: 'post', path: qs.getDataType(), data: opt.data });
                    guiPopUp.success(
                        this.$t(pop_up_msg.instance.success.add).format([this.$t(this.view.name)]),
                    );
                } catch (error) {
                    let str = window.app.error_handler.errorToString(error);
                    let srt_to_show = this.$t(pop_up_msg.instance.error.add).format([
                        this.$t(this.view.name),
                        str,
                    ]);
                    window.app.error_handler.showError(srt_to_show, str);
                }
            },

            // Pagination

            goToPage(pageNumber) {
                this.$router.push({
                    name: this.$route.name,
                    params: this.$route.params,
                    query: $.extend(true, {}, this.$route.query, { page: pageNumber }),
                });
            },

            // Selections

            toggleSelection(instance) {
                this.commitMutation('toggleSelection', instance.getPkValue());
            },

            toggleAllSelection() {
                this.dispatchAction('toggleAllSelection');
            },

            // Page view

            openPageView(instance) {
                if (this.view.deepNestedParentView) {
                    return this.$router.push(joinPaths(this.$route.path, instance.getPkValue()));
                }
                const pageView = this.view.pageView;
                if (pageView) {
                    const link = formatPath(pageView.path, this.$route.params, instance);
                    if (pageView.isFileResponse) {
                        window.open(`${this.$app.api.baseURL}/${this.$app.api.defaultVersion}${link}`);
                    } else {
                        this.$router.push(link);
                    }
                }
            },

            // Multi actions

            async executeMultiAction(action) {
                const instances = this.instances.filter((instance) =>
                    this.selection.includes(instance.getPkValue()),
                );

                if (typeof this[`${action.name}Instances`] === 'function' && instances) {
                    return this[`${action.name}Instances`](action, instances);
                }

                await Promise.all(instances.map((instance) => this.executeAction(action, instance, true)));

                this.afterMultiAction(action, instances);
            },

            // eslint-disable-next-line no-unused-vars
            afterMultiAction(action, instances) {
                this.dispatchAction('updateData');
            },
        },
    };
</script>

<style scoped>
    .filters-buttons {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
    }
    .slide-from-left-leave-active,
    .slide-from-left-enter-active {
        transition: all 0.5s ease;
    }
    .slide-from-left-enter,
    .slide-from-left-leave-to {
        transform: translate(-120%, 0);
        opacity: 0;
    }
</style>
