<template>
    <table class="table table-bordered table-bordered-custom multiple-select">
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

                <th v-for="(field, idx) in fields" :key="idx" :class="td_classes('td', field.options.name)">
                    {{ $t((field.options.title || field.options.name).toLowerCase()) | capitalize | split }}
                </th>

                <th
                    v-if="instanceActions.length || instanceSublinks.length"
                    style="width: 60px"
                    :class="td_classes('column', 'actions')"
                />
            </tr>
        </thead>
        <tbody>
            <ListTableRow
                v-for="instance in instances"
                :key="instance.getPkValue()"
                :is-selected="selection.includes(instance.getPkValue())"
                :instance="instance"
                :fields="fields"
                :has-multi-actions="hasMultiActions"
                :actions="instanceActions"
                :sublinks="instanceSublinks"
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
    import SelectToggleButton from './SelectToggleButton.vue';
    import ListTableRow from './ListTableRow.vue';
    import BaseListTableMixin from './BaseListTableMixin.js';

    /**
     * Component for 'list' views data representation.
     * This component represents view data as table.
     */
    export default {
        name: 'ListTable',
        components: { ListTableRow, SelectToggleButton },
        mixins: [BaseListTableMixin],
        props: {
            instances: { type: Array, required: true },
            selection: { type: Array, required: true },
            fields: { type: Array, required: true },
            hasMultiActions: { type: Boolean, required: false, default: false },
            instanceActions: { type: Array, required: false, default: () => [] },
            instanceSublinks: { type: Array, required: false, default: () => [] },
            opt: { type: Object, required: false, default: () => {} },
        },
        computed: {
            allSelected() {
                return this.instances.every((instance) => this.selection.includes(instance.getPkValue()));
            },
            classes() {
                return this.allSelected ? 'selected' : '';
            },
        },
    };
</script>

<style scoped></style>
