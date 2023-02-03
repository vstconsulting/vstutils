<template>
    <div>
        <portal v-if="view.enableSearch && searchField" to="topNavigation">
            <form class="search-form" @submit.prevent="store.applySearchFilter(searchFieldValue)">
                <input
                    v-model="searchFieldValue"
                    class="form-control form-control-sm form-control-border search-input"
                    type="text"
                    :placeholder="$ts('Search')"
                />
                <button class="search-button" type="submit">
                    <i class="fas fa-search" />
                </button>
            </form>
        </portal>

        <portal v-if="!error && totalNumberOfInstances >= 0" to="titleAppend">
            <span class="badge bg-info">
                {{ totalNumberOfInstances }}
            </span>
        </portal>

        <portal to="appendButtonsRow">
            <Pagination :items="paginationItems" style="float: right" class="d-none d-md-block" />
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
                    @row-clicked="(instance) => view.openPageView(instance)"
                    @execute-instance-action="
                        ({ action, instance }) => $app.actions.execute({ action, instance, fromList: true })
                    "
                    @open-instance-sublink="({ sublink, instance }) => $u.openSublink(sublink, instance)"
                    @toggle-selection="store.toggleSelection"
                    @toggle-all-selection="store.toggleAllSelection"
                />
                <div class="list-footer-btns-wrapper">
                    <transition name="slide-from-left">
                        <MultiActions
                            v-if="multiActions.length && selection.length"
                            :multi-actions="multiActions"
                            :class="multiActionsClasses.uniq.value"
                            :selected="selection"
                            :instances="instances"
                            @execute-multi-action="executeMultiAction"
                        />
                    </transition>
                    <Pagination :items="paginationItems" style="float: right" />
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { computed, provide, ref } from 'vue';
    import { storeToRefs } from 'pinia';

    import { getApp } from '@/vstutils/utils';
    import { ViewPropsDef } from '@/vstutils/views/props';
    import { useViewStore } from '@/vstutils/store';

    import ListTable from './ListTable.vue';
    import MultiActions from './MultiActions.vue';
    import Pagination from './Pagination.vue';

    import type { Action, ListView, ViewPropsDefType } from '@/vstutils/views';

    const props = defineProps(ViewPropsDef as ViewPropsDefType<ListView>);

    const app = getApp();
    const store = useViewStore(props.view, { watchQuery: true });

    const multiActionsClasses = useUniqueCssClasses('selected__');
    provide('multiActionsClasses', multiActionsClasses);

    const searchField = computed(() => props.view?.filters?.['__search']);

    /**
     * Returns total number of instances, or -1 if instances has no count
     */
    const totalNumberOfInstances = computed(() => {
        return store.instances?.extra?.count ?? -1;
    });

    const fields = computed(() => Array.from(store.model.fields.values()).filter((field) => !field.hidden));

    const searchFieldValue = ref('');

    async function executeMultiAction(action: Action) {
        const instances = store.instances.filter((instance) =>
            store.selection.includes(instance.getPkValue()!),
        );

        return app.actions.execute({ action, instances });
    }

    const {
        error,
        instanceActions,
        instances,
        instanceSublinks,
        isEmpty,
        model,
        multiActions,
        paginationItems,
        selection,
    } = storeToRefs(store);
</script>

<script lang="ts">
    function useUniqueCssClasses(prefix = '') {
        const multiActionsClasses = ref<string[]>([]);

        function add(classes: string | string[]) {
            if (typeof classes === 'string') classes = [classes];
            for (const cls of classes) {
                multiActionsClasses.value.push(`${prefix}${cls}`);
            }
        }
        function remove(classes: string | string[]) {
            if (typeof classes === 'string') classes = [classes];
            for (const cls of classes) {
                const idx = multiActionsClasses.value.indexOf(`${prefix}${cls}`);
                if (idx !== -1) multiActionsClasses.value.splice(idx, 1);
            }
        }

        const uniq = computed(() => {
            return Array.from(new Set(multiActionsClasses.value));
        });

        return { add, remove, uniq };
    }
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
