<template>
    <div style="display: inline-block">
        <Preloader v-if="showLoader" />

        <Modal v-show="showModal" @close="close" @apply="addSelected">
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
        <OperationButton
            :title="$t('add') | capitalize"
            classes="btn btn-primary btn-operation-add"
            icon-classes="fa fa-folder-open"
            @clicked="open"
        />
    </div>
</template>

<script>
    import Preloader from '../common/Preloader.vue';
    import OperationButton from '../common/OperationButton.vue';
    import Modal from '../items/modal/Modal.vue';
    import Pagination from './Pagination.vue';
    import { formatPath, joinPaths, RequestTypes } from '../../utils';
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
        components: { FKMultiAutocompleteFieldSearchInput, ListTable, Pagination, Modal, Preloader, OperationButton },
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
                return this.view.objects.getResponseModelClass(RequestTypes.LIST);
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
                const path = this.view.deepNestedParentView
                    ? joinPaths(
                          this.view.deepNestedParentView.path,
                          instanceId,
                          this.view.deepNestedParentView.deepNestedViewFragment,
                      )
                    : qs.getDataType();

                try {
                    await qs.execute({
                        method: 'post',
                        path,
                        data: new AppendNestedModel({ id: instanceId }),
                    });
                    guiPopUp.success(this.$t(pop_up_msg.instance.success.add, [this.$t(this.view.title)]));
                } catch (error) {
                    let str = this.$app.error_handler.errorToString(error);
                    let srt_to_show = this.$t(pop_up_msg.instance.error.add, [this.$t(this.view.title), str]);
                    this.$app.error_handler.showError(srt_to_show, str);
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
