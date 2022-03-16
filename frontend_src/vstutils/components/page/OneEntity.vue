<template>
    <EntityView
        :error="error"
        :loading="loading"
        :response="response"
        :view="view"
        :actions="actions"
        :sublinks="sublinks"
        :instances="[instance]"
        @execute-action="executeAction($event, instance)"
        @open-sublink="openSublink($event, instance)"
    >
        <div class="row">
            <component :is="beforeFieldsGroupsComponent" v-if="beforeFieldsGroupsComponent" :page="self" />
            <div :class="modelsFieldsWrapperClasses">
                <ModelFields
                    :data="data"
                    :model="model"
                    :editable="!readOnly"
                    :fields-groups="fieldsGroups"
                    :fields-errors="fieldsErrors"
                    :hide-read-only="hideReadOnly"
                    :hide-not-required="hideNotRequired"
                    @set-value="setFieldValue"
                />
            </div>
            <component :is="afterFieldsGroupsComponent" v-if="afterFieldsGroupsComponent" :page="self" />
        </div>
    </EntityView>
</template>

<script>
    import PageWithDataMixin from '../../views/mixins/PageWithDataMixin.js';
    import ViewWithAutoUpdateMixin from '../../views/mixins/ViewWithAutoUpdateMixin.js';
    import { RequestTypes } from '../../utils';
    import EntityView from '../common/EntityView.vue';
    import { BaseViewMixin } from '../BaseViewMixin.js';
    import HideNotRequiredSelect from './HideNotRequiredSelect';
    import ModelFields from './ModelFields.vue';

    export default {
        name: 'OneEntity',
        components: { ModelFields, HideNotRequiredSelect, EntityView },
        mixins: [BaseViewMixin, PageWithDataMixin, ViewWithAutoUpdateMixin],
        data() {
            return {
                readOnly: false,
                hideReadOnly: false,
                hideNotRequired: false,
                hiddenFields: [],
                fieldsErrors: {},
            };
        },
        computed: {
            self() {
                return this;
            },
            beforeFieldsGroupsComponent() {
                return null;
            },
            afterFieldsGroupsComponent() {
                return null;
            },
            modelsFieldsWrapperClasses() {
                return 'col-12';
            },
            showBackButton() {
                return true;
            },
            model() {
                return this.view.objects.getResponseModelClass(RequestTypes.RETRIEVE);
            },
            data() {
                return this.$store.getters[this.storeName + '/sandbox'];
            },
            fieldsGroups() {
                return undefined;
            },
        },
        methods: {
            /**
             * Updates field value in store
             * @param {Object} obj
             * @param {string} obj.field
             * @param {any} obj.value
             */
            setFieldValue(obj) {
                this.$delete(this.fieldsErrors, obj.field);
                this.commitMutation('setFieldValue', obj);
            },
            fieldsGroupClasses(name) {
                return ['col-md-6', 'fields-group', `fields-group-${name.replace(/ /g, '_')}`];
            },
        },
    };
</script>
