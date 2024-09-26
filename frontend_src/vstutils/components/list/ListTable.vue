<template>
    <div class="table-responsive">
        <table class="table table-bordered table-hover multiple-select">
            <thead>
                <tr :class="classes">
                    <th
                        v-if="hasMultiActions"
                        style="width: 50px"
                        class="global-select td_select_btn"
                        @click="$emit('toggle-all-selection')"
                    >
                        <SelectToggleButton :is-selected="allSelected" />
                    </th>

                    <th v-for="(field, idx) in fields" :key="idx" :class="tableColumnClasses(field)">
                        {{ $t(field.title) }}
                        <Popover v-if="field.description" :content="field.description" />
                    </th>

                    <th v-if="showInstanceOperations" style="width: 60px" class="column column-actions" />
                </tr>
            </thead>
            <tbody>
                <ListTableRow
                    v-for="{ instance, actions, sublinks } in instancesWithOperations"
                    :key="instance.getPkValue()"
                    :is-selected="isSelected(instance)"
                    :instance="instance"
                    :fields="fields"
                    :has-multi-actions="hasMultiActions"
                    :show-operations="showInstanceOperations"
                    :actions="actions"
                    :sublinks="sublinks"
                    :opt="opt"
                    @row-clicked="$emit('row-clicked', $event)"
                    @open-sublink="$emit('open-instance-sublink', $event)"
                    @execute-action="$emit('execute-instance-action', $event)"
                    @toggle-selection="$emit('toggle-selection', $event)"
                />
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
    import { computed } from 'vue';
    import { filterOperations } from '#vstutils/signals';
    import Popover from '../Popover.vue';
    import SelectToggleButton from './SelectToggleButton.vue';
    import ListTableRow from './ListTableRow.vue';
    import { tableColumnClasses } from '../../utils';
    import {
        filterOperationsBasedOnAvailabilityField,
        type Action,
        type Sublink,
    } from './../../views/operations';
    import type { Model } from './../../models/Model';

    const props = withDefaults(
        defineProps<{
            instances: Model[];
            selection: (string | number)[];
            fields: any[];
            hasMultiActions?: boolean;
            showOperations?: boolean;
            instanceActions?: Action[];
            instanceSublinks?: Sublink[];
            operationsAvailabilityFieldName?: string;
            opt?: any;
        }>(),
        {
            hasMultiActions: false,
            instanceActions: () => [],
            instanceSublinks: () => [],
        },
    );

    const allSelected = computed(() => {
        return props.instances.every((instance) => props.selection.includes(instance.getPkValue()!));
    });

    const classes = computed(() => {
        return allSelected.value ? 'selected' : '';
    });

    function availableActions(instance: Model) {
        return filterOperationsBasedOnAvailabilityField(
            filterOperations('actions', props.instanceActions, instance.sandbox.value, true),
            instance.sandbox.value,
            props.operationsAvailabilityFieldName,
        );
    }
    function availableSublinks(instance: Model) {
        return filterOperationsBasedOnAvailabilityField(
            filterOperations('sublinks', props.instanceSublinks, instance.sandbox.value, true),
            instance.sandbox.value,
            props.operationsAvailabilityFieldName,
        );
    }

    const instancesWithOperations = computed(() => {
        return props.instances.map((instance) => {
            return {
                instance,
                actions: availableActions(instance),
                sublinks: availableSublinks(instance),
            };
        });
    });

    const showInstanceOperations = computed(() => {
        return instancesWithOperations.value.some(
            ({ actions, sublinks }) => actions.length > 0 || sublinks.length > 0,
        );
    });

    function isSelected(instance: Model) {
        return props.selection.includes(instance.getPkValue()!);
    }
</script>

<style scoped>
    .table {
        margin: 0;
    }
</style>
