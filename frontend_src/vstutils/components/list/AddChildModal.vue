<template>
    <div style="display: inline-block">
        <Preloader v-if="showLoader" />

        <Modal v-show="showModal" @close="close">
            <template #header>
                <h3>{{ ($t('add') + ' ' + $t('child instances')) | capitalize }}</h3>
            </template>
            <template #body>
                <FKMultiAutocompleteFieldSearchInput
                    :field_props="{ view_field: viewField.name }"
                    @filterQuerySetItems="filterQuerySetItems"
                />
                <template v-if="!instances.length">
                    <p class="text-center">
                        {{ $t('list is empty') | capitalize }}
                    </p>
                </template>
                <template v-else>
                    <Pagination v-bind="pagination" @open-page="goToPage" />
                    <ListTable
                        :instances="instances"
                        :selection="selection"
                        :fields="fields"
                        :has-multi-actions="true"
                        @row-clicked="rowClicked"
                        @toggle-selection="toggleSelection"
                        @toggle-all-selection="toggleAllSelection"
                    />
                </template>
            </template>
            <template #footer>
                <button
                    class="btn btn-default btn-operation-add-child-close"
                    aria-label="Cancel"
                    @click="close"
                >
                    {{ $t('cancel') | capitalize }}
                </button>
                <button
                    class="btn btn-primary btn-operation-add-child-apply"
                    aria-label="Add selected"
                    @click="addSelected"
                >
                    {{ $t('add') | capitalize }}
                </button>
            </template>
        </Modal>
        <button class="btn btn-primary btn-operation-add" aria-label="Add" @click="open">
            <span class="fa fa-folder-open" />
            <span class="d-none d-lg-inline-block title-for-btn">{{ $t('add') | capitalize }}</span>
        </button>
    </div>
</template>

<script>
    import Preloader from '../common/Preloader.vue';
    import Modal from '../items/modal/Modal.vue';
    import Pagination from './Pagination.vue';
    import { formatPath, RequestTypes } from '../../utils';
    import ListTable from './ListTable.vue';
    import BaseModalWindowForInstanceList from '../../fields/BaseModalWindowForInstanceList.vue';
    import FKMultiAutocompleteFieldSearchInput from '../../fields/fk/multi-autocomplete/FKMultiAutocompleteFieldSearchInput.vue';
    import { guiPopUp, pop_up_msg } from '../../popUp';
    import { Model, ModelClass } from '../../models/Model.js';
    import StringField from '../../fields/text/StringField.js';

    @ModelClass()
    class AppendNestedModel extends Model {
        static declaredFields = [new StringField({ name: 'id' })];
    }

    /**
     * Component for modal window with list of child instances,
     * that can be added to the parents list.
     */
    export default {
        name: 'AddChildModal',
        components: { FKMultiAutocompleteFieldSearchInput, ListTable, Pagination, Modal, Preloader },
        mixins: [BaseModalWindowForInstanceList],
        props: {
            view: { type: Object, required: true },
        },
        data() {
            return {
                queryset: this.view.nestedQueryset.clone({
                    url: formatPath(this.view.nestedQueryset.url, this.$route.params),
                }),
            };
        },
        computed: {
            model() {
                return this.view.objects.getModelClass(RequestTypes.LIST);
            },
            fields() {
                return Array.from(this.model.fields.values()).filter(
                    (field) => !field.hidden && field !== this.model.pkField,
                );
            },
            allSelected() {
                return this.instances.every((instance) => this.selection.includes(instance.getPkValue()));
            },
            viewField() {
                return this.model.viewField;
            },
        },
        methods: {
            rowClicked(instance) {
                this.addChildToParent(instance.getPkValue());
                this.close();
            },
            /**
             * Method, that inits adding of selected child instances to parent list.
             */
            addSelected() {
                for (const id of this.selection) {
                    this.addChildToParent(id);
                }
                this.close();
            },
            async addChildToParent(instanceId) {
                const qs = this.view.objects.clone({
                    url: formatPath(this.view.objects.url, this.$route.params),
                });

                try {
                    await qs.execute({
                        method: 'post',
                        path: qs.getDataType(),
                        data: new AppendNestedModel({ id: instanceId }),
                    });
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
            /**
             * Redefinitions of base 'onClose' method.
             */
            onClose() {
                this.selections = { ...{} };
            },
        },
    };
</script>

<style scoped>
    .btn-operation-add {
        order: -10;
        margin-right: 5px;
    }
</style>
