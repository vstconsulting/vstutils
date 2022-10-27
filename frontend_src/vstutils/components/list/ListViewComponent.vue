<template>
    <div>
        <portal v-if="showSearch && searchField" to="topNavigation">
            <form class="search-form" @submit.prevent="store.applySearchFilter(searchFieldValue)">
                <input
                    v-model="searchFieldValue"
                    class="form-control form-control-sm form-control-border search-input"
                    type="text"
                    :placeholder="$t('Search')"
                />
                <button class="search-button" type="submit">
                    <i class="fas fa-search" />
                </button>
            </form>
        </portal>

        <portal v-if="isInstanceCounterActive && !error && totalNumberOfInstances >= 0" to="titleAppend">
            <span class="badge bg-info">
                {{ totalNumberOfInstances }}
            </span>
        </portal>

        <portal to="appendButtonsRow">
            <Pagination
                v-bind="pagination"
                style="float: right"
                class="d-none d-md-block"
                @open-page="goToPage"
            />
        </portal>

        <div class="list-content-component" :class="`list-${model.name}`">
            <template v-if="isEmpty">
                <p class="text-center empty-list-p">
                    {{ $t('List is empty') }}
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
                    @execute-instance-action="
                        ({ action, instance }) => $app.actions.execute({ action, instance, fromList: true })
                    "
                    @open-instance-sublink="({ sublink, instance }) => $u.openSublink(sublink, instance)"
                    @toggle-selection="toggleSelection"
                    @toggle-all-selection="toggleAllSelection"
                />
                <div class="list-footer-btns-wrapper">
                    <transition name="slide-from-left">
                        <MultiActions
                            v-if="multiActions.length && selection.length"
                            :multi-actions="multiActions"
                            :class="uniqMultiActionsClasses"
                            :selected="selection"
                            :instances="instances"
                            @execute-multi-action="executeMultiAction"
                        />
                    </transition>
                    <Pagination v-bind="pagination" style="float: right" @open-page="goToPage" />
                </div>
            </template>
        </div>
    </div>
</template>

<script>
    import { guiPopUp, pop_up_msg } from '../../popUp';
    import ListTable from './ListTable.vue';
    import MultiActions from './MultiActions.vue';
    import Pagination from './Pagination.vue';
    import { formatPath, joinPaths, mapStoreState, mapStoreActions } from '../../utils';
    import { BaseViewMixin } from '../BaseViewMixin.ts';

    export default {
        components: { Pagination, MultiActions, ListTable },
        mixins: [BaseViewMixin],
        provide() {
            return {
                multiActionsClasses: {
                    add: this.addMultiActionsClasses,
                    remove: this.removeMultiActionsClasses,
                },
            };
        },
        inject: ['requestConfirmation'],
        data() {
            return {
                isInstanceCounterActive: true,
                showSearch: true,
                searchFieldValue: '',
                multiActionsClasses: [],
            };
        },
        computed: {
            searchField() {
                return this.view?.filters?.['__search'];
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
            uniqMultiActionsClasses() {
                return Array.from(new Set(this.multiActionsClasses));
            },
            ...mapStoreState([
                'model',
                'filters',
                'instances',
                'isEmpty',
                'selection',
                'pagination',
                'multiActions',
                'instanceActions',
                'instanceSublinks',
                'filters',
            ]),
        },
        methods: {
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
                    path: this.$route.path,
                    query: { ...this.$route.query, page: pageNumber },
                });
            },

            // Page view

            openPageView(instance) {
                if (this.view.isDeepNested) {
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

                return this.$app.actions.execute({ action, instances });
            },

            addMultiActionsClasses(classes) {
                if (typeof classes === 'string') classes = [classes];
                classes.forEach((cls) => {
                    this.multiActionsClasses.push(`selected__${cls}`);
                });
            },
            removeMultiActionsClasses(classes) {
                if (typeof classes === 'string') classes = [classes];
                classes.forEach((c) => {
                    const idx = this.multiActionsClasses.indexOf(`selected__${c}`);
                    if (idx !== -1) this.multiActionsClasses.splice(idx, 1);
                });
            },
            ...mapStoreActions(['fetchData', 'toggleSelection', 'toggleAllSelection']),
        },
    };
</script>

<style scoped>
    .filters-buttons {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
    }
    .search-form {
        display: flex;
        position: relative;
    }

    .search-input {
        padding: 0 30px 0 8px;
    }
    .search-button {
        position: relative;
        right: 30px;
        top: auto;
        border: none;
        background-color: transparent;
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
