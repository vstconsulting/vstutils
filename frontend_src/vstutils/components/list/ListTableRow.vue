<template>
    <tr
        class="item-row item-row-id highlight-tr"
        :class="classes"
        :data-id="pk"
        @mousedown="onMouseDownHandler"
    >
        <td
            v-if="hasMultiActions"
            class="highlight-tr-none guiListSelections-toggle-btn td_select_btn"
            @click.stop="$emit('toggle-selection', instance)"
        >
            <SelectToggleButton :is-selected="isSelected" />
        </td>
        <td
            v-for="field in fields"
            :key="field.name"
            :class="td_classes('td', field.name)"
            @click="$emit('row-clicked', instance)"
        >
            <component :is="field.component" :field="field" :data="data" type="list" />
        </td>
        <td
            v-if="actions.length || sublinks.length"
            :class="td_classes('column', 'actions')"
            style="text-align: center"
        >
            <div class="btn-group dropleft">
                <button
                    type="button"
                    class="btn btn-primary dropdown-toggle"
                    data-toggle="dropdown"
                    aria-haspopup="true"
                    aria-expanded="false"
                />
                <div class="dropdown-menu">
                    <template v-if="actions.length">
                        <h6 class="dropdown-header">Actions</h6>
                        <a
                            v-for="action in actions"
                            :key="action.name"
                            class="dropdown-item"
                            @click="$emit('execute-action', { action, instance })"
                        >
                            {{ action.title }}
                        </a>
                    </template>
                    <template v-if="sublinks.length">
                        <h6 class="dropdown-header">Sublinks</h6>
                        <a
                            v-for="sublink in sublinks"
                            :key="sublink.name"
                            class="dropdown-item"
                            @click="$emit('open-sublink', { sublink, instance })"
                        >
                            {{ sublink.title }}
                        </a>
                    </template>
                </div>
            </div>
        </td>
    </tr>
</template>

<script>
    import TableRowMixin from '../../fields/TableRowMixin.js';
    import SelectToggleButton from './SelectToggleButton.vue';
    import BaseListTableMixin from './BaseListTableMixin.js';

    /**
     * Child component of 'gui_list_table' component.
     * This component represents view data item as table row.
     */
    export default {
        name: 'ListTableRow',
        components: { SelectToggleButton },
        mixins: [BaseListTableMixin, TableRowMixin],
        props: {
            isSelected: { type: Boolean, required: true },
            instance: { type: Object, required: true },
            fields: { type: Array, required: true },
            hasMultiActions: { type: Boolean, required: true },
            actions: { type: Array, required: false, default: () => [] },
            sublinks: { type: Array, required: false, default: () => [] },
        },
        computed: {
            pk() {
                return this.instance.getPkValue();
            },
            classes() {
                return this.isSelected ? 'selected' : '';
            },
            base_url() {
                return this.$route.path.replace(/\/$/g, '');
            },
            data() {
                return this.instance._getRepresentData();
            },
            openInNewWindow() {
                return false;
            },
            actionButtonsText() {
                return '';
            },
        },
    };
</script>

<style scoped></style>
