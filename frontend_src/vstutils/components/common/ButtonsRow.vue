<template>
    <div class="buttons-row-wrapper d-print-none">
        <!-- Not grouped -->
        <OperationButton
            v-for="sublink in notGroupedSublinks"
            :key="sublink.name"
            v-bind="sublink"
            @click.native="$emit('open-sublink', sublink)"
        />
        <template v-for="action in notGroupedActions">
            <component
                :is="action.component"
                v-if="action.component"
                :key="action.name"
                :view="view"
                :style="action.style"
            >
                <template #default="{ execute }">
                    <OperationButton :key="action.name" v-bind="action" @click.native="execute({ action })" />
                </template>
            </component>
            <OperationButton
                v-else
                :key="action.name"
                v-bind="action"
                @click.native="$emit('execute-action', action)"
            />
        </template>

        <!-- Sublinks -->
        <template v-if="totalOperations > 2 && shouldGroupSublinks">
            <CompactOperations
                v-if="groupedSublinks.length"
                :title="$u.capitalize($ts('sublinks'))"
                icon="fas fa-link"
                :view="view"
                :operations="groupedSublinks"
                @clicked="$emit('open-sublink', $event)"
            />
        </template>
        <template v-else>
            <OperationButton
                v-for="sublink in groupedSublinks"
                :key="sublink.name"
                v-bind="sublink"
                @click.native="$emit('open-sublink', sublink)"
            />
        </template>

        <!-- Actions -->
        <template v-if="totalOperations > 2 && shouldGroupActions">
            <CompactOperations
                v-if="groupedActions"
                :title="$u.capitalize($ts('actions'))"
                icon="fas fa-ellipsis-v"
                :view="view"
                :operations="groupedActions"
                @clicked="$emit('execute-action', $event)"
            />
        </template>
        <template v-else>
            <template v-for="action in groupedActions">
                <component :is="action.component" v-if="action.component" :key="action.name" :view="view">
                    <template #default="{ execute }">
                        <OperationButton
                            :key="action.name"
                            v-bind="action"
                            @click.native="execute({ action })"
                        />
                    </template>
                </component>
                <OperationButton
                    v-else
                    :key="action.name"
                    v-bind="action"
                    @click.native="$emit('execute-action', action)"
                />
            </template>
        </template>
    </div>
</template>

<script setup lang="ts">
    import { computed } from 'vue';
    import OperationButton from './OperationButton.vue';
    import CompactOperations from './CompactOperations.vue';

    import type { Action, IView, Sublink } from '@/vstutils/views';

    const props = withDefaults(
        defineProps<{
            view: IView;
            actions?: Action[];
            sublinks?: Sublink[];
        }>(),
        { sublinks: () => [], actions: () => [] },
    );

    const totalOperations = computed(() => {
        return props.actions.length + props.sublinks.length;
    });

    const groupedActions = computed(() => {
        return props.actions.filter((action) => !action.doNotGroup);
    });
    const notGroupedActions = computed(() => {
        return props.actions.filter((action) => action.doNotGroup);
    });
    const shouldGroupActions = computed(() => {
        return groupedActions.value.length > 1 || groupedActions.value.some((action) => !action.iconClasses);
    });

    const groupedSublinks = computed(() => {
        return props.sublinks.filter((sublink) => !sublink.doNotGroup);
    });
    const notGroupedSublinks = computed(() => {
        return props.sublinks.filter((sublink) => sublink.doNotGroup);
    });
    const shouldGroupSublinks = computed(() => {
        return (
            groupedSublinks.value.length > 1 || groupedSublinks.value.some((sublink) => !sublink.iconClasses)
        );
    });
</script>

<style scoped>
    .buttons-row-wrapper {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        flex-grow: 1;
        margin-bottom: 0;
        padding-bottom: 0;
    }
    .buttons-row-wrapper::v-deep button {
        margin-top: 5px;
        margin-right: 5px;
        height: 35px;
    }
</style>
