<template>
    <table class="table table-bordered table-bordered-custom table-hover multiple-select">
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
                :is-selected="selection.includes(instance.getPkValue())"
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
</template>

<script>
    import { filterOperations } from '#vstutils/signals';
    import Popover from '../Popover.vue';
    import SelectToggleButton from './SelectToggleButton.vue';
    import ListTableRow from './ListTableRow.vue';
    import { tableColumnClasses } from '../../utils';

    /**
     * Component for 'list' views data representation.
     * This component represents view data as table.
     */
    export default {
        name: 'ListTable',
        components: { ListTableRow, SelectToggleButton, Popover },
        props: {
            instances: { type: Array, required: true },
            selection: { type: Array, required: true },
            fields: { type: Array, required: true },
            hasMultiActions: { type: Boolean, required: false, default: false },
            instanceActions: { type: Array, required: false, default: () => [] },
            instanceSublinks: { type: Array, required: false, default: () => [] },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            opt: { type: Object, required: false, default: () => {} },
        },
        data() {
            return {
                tableColumnClasses,
            };
        },
        computed: {
            showInstanceOperations() {
                return this.instancesWithOperations.some(
                    ({ actions, sublinks }) => actions.length > 0 || sublinks.length > 0,
                );
            },
            instancesWithOperations() {
                return this.instances.map((instance) => {
                    return {
                        instance,
                        actions: this.availableActions(instance),
                        sublinks: this.availableSublinks(instance),
                    };
                });
            },
            allSelected() {
                return this.instances.every((instance) => this.selection.includes(instance.getPkValue()));
            },
            classes() {
                return this.allSelected ? 'selected' : '';
            },
        },
        methods: {
            availableActions(instance) {
                return filterOperations('actions', this.instanceActions, instance.sandbox.value, true);
            },
            availableSublinks(instance) {
                return filterOperations('sublinks', this.instanceSublinks, instance.sandbox.value, true);
            },
        },
    };
</script>
