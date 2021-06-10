<template>
    <BootstrapModal ref="modal">
        <template #activator="{ openModal, closeModal }">
            <slot name="activator" :openModal="openModal" :closeModal="closeModal" />
        </template>
        <template #content>
            <div class="modal-header">
                <h5 class="modal-title" v-text="$t(title)" />
            </div>
            <div class="modal-body">
                <FKMultiAutocompleteFieldSearchInput
                    v-if="!disableFilter"
                    :title="filterFieldTitle"
                    @filter="searchTerm = $event"
                />
                <template v-if="!instances.length">
                    <p class="text-center">
                        {{ $t('list is empty') | capitalize }}
                    </p>
                </template>
                <template v-else>
                    <Pagination v-bind="pagination" @open-page="pagination.pageNumber = $event" />
                    <ListTable
                        :instances="instances"
                        :selection="selection"
                        :fields="fields"
                        :has-multi-actions="true"
                        @row-clicked="rowClickHandler"
                        @toggle-selection="toggleSelection"
                        @toggle-all-selection="toggleAllSelection"
                    />
                </template>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary btn-apply" @click="apply">
                    {{ $t(applyButtonText) }}
                </button>
            </div>
        </template>
    </BootstrapModal>
</template>

<script>
    import FKMultiAutocompleteFieldSearchInput from '../../fields/fk/multi-autocomplete/FKMultiAutocompleteFieldSearchInput';
    import ListTable from './ListTable';
    import Pagination from './Pagination';
    import BootstrapModal from '../BootstrapModal';
    import { RequestTypes } from '../../utils';

    export default {
        name: 'BaseListModal',
        components: {
            BootstrapModal,
            FKMultiAutocompleteFieldSearchInput,
            ListTable,
            Pagination,
        },
        props: {
            title: { type: String, required: true },
            qs: { type: Object, required: true },
            applyButtonText: { type: String, required: true },
            rowClickHandler: { type: Function, default: () => {} },
            model: {
                default: function () {
                    return this.qs.getResponseModelClass(RequestTypes.LIST);
                },
            },
            fields: {
                type: Array,
                default: function () {
                    return Array.from(this.model.fields.values()).filter(
                        (field) => !field.hidden && field !== this.model.pkField,
                    );
                },
            },
            disableFilter: { type: Boolean, default: false },
            filterFieldName: {
                type: String,
                default: function () {
                    return this.model.viewField?.name;
                },
            },
            filterFieldTitle: {
                type: String,
                default: function () {
                    return this.model.fields.get(this.filterFieldName).title || '';
                },
            },
        },
        data: () => ({
            isLoading: false,
            instances: [],
            selection: [],
            searchTerm: null,
            pagination: {
                count: 0,
                pageSize: 20,
                pageNumber: 1,
            },
        }),
        computed: {
            queryset() {
                return this.qs.filter({
                    limit: this.pagination.pageSize,
                    offset: this.pagination.pageSize * (this.pagination.pageNumber - 1),
                    ...(this.searchTerm && { [this.filterFieldName]: this.searchTerm }),
                });
            },
            allSelected() {
                return this.instances.every((instance) => this.selection.includes(instance.getPkValue()));
            },
        },
        watch: {
            queryset: { handler: 'fetchInstances', immediate: true },
        },
        methods: {
            close() {
                this.$refs.modal.close();
            },
            async fetchInstances() {
                this.instances = await this.queryset.items();
                this.pagination.count = this.instances.extra.count;
            },
            toggleAllSelection() {
                this.selection = this.allSelected
                    ? []
                    : this.instances.map((instance) => instance.getPkValue());
            },
            toggleSelection(instance) {
                const instanceId = instance.getPkValue();
                const index = this.selection.indexOf(instanceId);
                if (index === -1) {
                    this.selection.push(instanceId);
                } else {
                    this.$delete(this.selection, index);
                }
            },
            apply() {
                this.$emit(
                    'apply',
                    this.instances.filter((instance) => this.selection.includes(instance.getPkValue())),
                );
                this.close();
            },
        },
    };
</script>
