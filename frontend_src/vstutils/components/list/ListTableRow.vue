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
            :class="tableColumnClasses(field)"
            @click="$emit('row-clicked', instance)"
        >
            <component :is="field.component" :field="field" :data="data" type="list" />
        </td>
        <td v-if="hasOperations" class="column column-actions" style="text-align: center">
            <BootstrapModal classes="modal-sm">
                <template #activator="{ openModal }">
                    <button class="btn btn-outline-secondary" @click="openModal">
                        <i class="fas fa-cog" />
                    </button>
                </template>
                <template #content="{ closeModal }">
                    <div class="modal-body">
                        <ul class="list-group list-group-flush">
                            <template v-if="actions.length">
                                <li class="list-group-item disabled">
                                    <b>{{ $t('actions') | capitalize }}</b>
                                </li>
                                <li v-for="action in actions" :key="action.name" class="list-group-item">
                                    <a href="#" @click.prevent="createActionClickHandler(closeModal, action)">
                                        <i
                                            v-if="action.iconClasses && action.iconClasses.length"
                                            :class="action.iconClasses"
                                        />
                                        {{ $t(action.title) | capitalize }}
                                    </a>
                                </li>
                            </template>
                            <template v-if="sublinks.length">
                                <li class="list-group-item disabled">
                                    <b>{{ $t('sublinks') | capitalize }}</b>
                                </li>
                                <li v-for="sublink in sublinks" :key="sublink.name" class="list-group-item">
                                    <router-link
                                        :to="formatPath(sublink.href, $route.params, instance)"
                                        @click.native.capture="closeModal"
                                    >
                                        <i
                                            v-if="sublink.iconClasses && sublink.iconClasses.length"
                                            :class="sublink.iconClasses"
                                        />
                                        {{ $t(sublink.title) | capitalize }}
                                    </router-link>
                                </li>
                            </template>
                        </ul>
                    </div>
                </template>
            </BootstrapModal>
        </td>
    </tr>
</template>

<script>
    import TableRowMixin from '../../fields/TableRowMixin.js';
    import SelectToggleButton from './SelectToggleButton.vue';
    import Modal from '../items/modal/Modal.vue';
    import BootstrapModal from '../BootstrapModal.vue';
    import { formatPath, tableColumnClasses } from '../../utils';

    /**
     * Child component of 'gui_list_table' component.
     * This component represents view data item as table row.
     */
    export default {
        name: 'ListTableRow',
        components: { BootstrapModal, Modal, SelectToggleButton },
        mixins: [TableRowMixin],
        props: {
            isSelected: { type: Boolean, required: true },
            instance: { type: Object, required: true },
            fields: { type: Array, required: true },
            hasMultiActions: { type: Boolean, required: true },
            actions: { type: Array, required: false, default: () => [] },
            sublinks: { type: Array, required: false, default: () => [] },
        },
        data: () => ({ formatPath, tableColumnClasses }),
        computed: {
            hasOperations() {
                return this.actions.length || this.sublinks.length;
            },
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
        methods: {
            createActionClickHandler(callback, action) {
                callback();
                this.$emit('execute-action', { action, instance: this.instance });
            },
        },
    };
</script>

<style scoped>
    .item-row td {
        padding: 7px;
    }
    tr {
        /* This style is required so cells could not grow infinitely.
           To prevent cell from grow 'height: inherit' must be set on td */
        height: 1px;
    }
    td.column-actions {
        padding: 5px;
    }
</style>
