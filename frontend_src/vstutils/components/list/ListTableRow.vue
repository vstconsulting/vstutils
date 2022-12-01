<template>
    <tr class="item-row item-row-id" :class="classes" :data-id="pk" @mousedown="onMouseDownHandler">
        <td
            v-if="hasMultiActions"
            class="highlight-tr-none guiListSelections-toggle-btn td_select_btn"
            @click.stop="$emit('toggle-selection', pk)"
        >
            <SelectToggleButton :is-selected="isSelected" />
        </td>
        <td
            v-for="field in fields"
            :key="field.name"
            :class="tableColumnClasses(field)"
            @click="$emit('row-clicked', instance)"
        >
            <component
                :is="field.component"
                :field="field"
                :data="sandbox"
                type="list"
                @set-value="setFieldValue"
            />
        </td>
        <td v-if="showOperations" class="column column-actions" style="text-align: center">
            <BootstrapModal
                v-if="hasOperations"
                :classes="'modal-sm list-instance-operations ' + classesFromFields.join(' ')"
            >
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
                                    <b>{{ $u.capitalize($t('actions')) }}</b>
                                </li>
                                <li
                                    v-for="action in actions"
                                    :key="action.name"
                                    class="list-group-item"
                                    :class="`operation__${action.name}`"
                                >
                                    <component
                                        :is="action.component"
                                        v-if="action.component"
                                        :key="action.name"
                                        :action="action"
                                    >
                                        <template #default="{ execute }">
                                            <a href="" @click.prevent="execute({ instances: [instance] })">
                                                <i
                                                    v-if="action.iconClasses && action.iconClasses.length"
                                                    :class="action.iconClasses"
                                                />
                                                {{ $u.capitalize($t(action.title)) }}
                                            </a>
                                        </template>
                                    </component>
                                    <a
                                        v-else
                                        href="#"
                                        @click.prevent="createActionClickHandler(closeModal, action)"
                                    >
                                        <i
                                            v-if="action.iconClasses && action.iconClasses.length"
                                            :class="action.iconClasses"
                                        />
                                        {{ $u.capitalize($t(action.title)) }}
                                    </a>
                                </li>
                            </template>
                            <template v-if="sublinks.length">
                                <li class="list-group-item disabled">
                                    <b>{{ $u.capitalize($t('sublinks')) }}</b>
                                </li>
                                <li
                                    v-for="sublink in sublinks"
                                    :key="sublink.name"
                                    class="list-group-item"
                                    :class="`operation__${sublink.name}`"
                                >
                                    <router-link
                                        :to="getSublinkPath(sublink, instance)"
                                        @click.native.capture="closeModal"
                                    >
                                        <i
                                            v-if="sublink.iconClasses && sublink.iconClasses.length"
                                            :class="sublink.iconClasses"
                                        />
                                        {{ $u.capitalize($t(sublink.title)) }}
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
    import BootstrapModal from '../BootstrapModal.vue';
    import { formatPath, joinPaths, tableColumnClasses, classesFromFields } from '../../utils';

    /**
     * Child component of 'gui_list_table' component.
     * This component represents view data item as table row.
     */
    export default {
        name: 'ListTableRow',
        components: { BootstrapModal, SelectToggleButton },
        mixins: [TableRowMixin],
        inject: { multiActionsClasses: { default: null } },
        props: {
            isSelected: { type: Boolean, required: true },
            showOperations: { type: Boolean, default: true },
            instance: { type: Object, required: true },
            fields: { type: Array, required: true },
            hasMultiActions: { type: Boolean, required: true },
            actions: { type: Array, required: false, default: () => [] },
            sublinks: { type: Array, required: false, default: () => [] },
        },
        data() {
            return {
                formatPath,
                tableColumnClasses,
                sandbox: {},
            };
        },
        computed: {
            hasOperations() {
                return this.actions.length || this.sublinks.length;
            },
            pk() {
                return this.instance.getPkValue();
            },
            classesFromFields() {
                return classesFromFields(this.fields, this.sandbox);
            },
            classes() {
                const classes = this.isSelected ? ['selected'] : [];
                return classes.concat(this.classesFromFields);
            },
            base_url() {
                return this.$route.path.replace(/\/$/g, '');
            },
            openInNewWindow() {
                return false;
            },
            actionButtonsText() {
                return '';
            },
        },
        watch: {
            instance: {
                handler(instance) {
                    this.sandbox = instance._getRepresentData();
                },
                immediate: true,
            },
            isSelected: {
                handler(val) {
                    if (!this.multiActionsClasses) return;
                    if (val) this.multiActionsClasses.add(this.classesFromFields);
                    else this.multiActionsClasses.remove(this.classesFromFields);
                },
                immediate: true,
            },
        },
        methods: {
            setFieldValue({ field, value }) {
                this.sandbox[field] = value;
            },
            createActionClickHandler(callback, action) {
                callback();
                this.$nextTick(() => {
                    this.$emit('execute-action', { action, instance: this.instance });
                });
            },
            getSublinkPath(sublink, instance) {
                if (sublink.appendFragment) {
                    return joinPaths(this.$route.path, instance.getPkValue(), sublink.appendFragment);
                }
                return formatPath(sublink.href, this.$route.params, instance);
            },
        },
    };
</script>

<style scoped>
    .item-row {
        cursor: pointer;
    }
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

<style>
    .pk-column {
        display: none;
    }
</style>
