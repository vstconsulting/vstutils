<template>
    <EntityView
        :error="error"
        :loading="loading"
        :response="response"
        :view="view"
        :actions="actions"
        :sublinks="sublinks"
        @execute-action="executeAction($event, instance)"
        @open-sublink="openSublink($event, instance)"
    >
        <div v-if="hideNotRequired" class="card">
            <div class="card-body">
                <HideNotRequiredSelect
                    class="col-lg-4 col-xs-12 col-sm-6 col-md-6"
                    :fields="hiddenFields"
                    @show-field="showField"
                />
            </div>
        </div>
        <div class="row">
            <component :is="beforeFieldsGroupsComponent" v-if="beforeFieldsGroupsComponent" :page="self" />
            <div
                v-for="(fields, groupName) in fieldsGroups"
                :key="groupName"
                :class="fieldsGroupClasses(groupName)"
            >
                <div class="card">
                    <h5 v-if="groupName" class="card-header">
                        {{ $t(groupName) }}
                    </h5>
                    <div class="card-body">
                        <component
                            :is="field.component"
                            v-for="field in fields"
                            :key="field.name"
                            :field="field"
                            :data="data"
                            :type="fieldsType"
                            :error="fieldsErrors[field.name]"
                            :hideable="hideNotRequired && !field.required"
                            style="margin-bottom: 1rem"
                            @hide-field="hiddenFields.push(field)"
                            @set-value="setFieldValue"
                        />
                    </div>
                </div>
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

    export default {
        name: 'OneEntity',
        components: { HideNotRequiredSelect, EntityView },
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
            showBackButton() {
                return true;
            },
            model() {
                return this.view.objects.getResponseModelClass(RequestTypes.RETRIEVE);
            },
            data() {
                return this.$store.getters[this.storeName + '/sandbox'];
            },
            fieldsType() {
                return this.readOnly ? 'readonly' : 'edit';
            },
            fieldsGroups() {
                const groups = {};
                for (const [groupName, fieldsNames] of Object.entries(this.model.fieldsGroups)) {
                    const fields = fieldsNames
                        .map((fieldName) => this.model.fields.get(fieldName))
                        .filter(
                            (field) =>
                                field && this.shouldShowField(field) && !this.hiddenFields.includes(field),
                        );
                    if (fields.length) groups[groupName] = fields;
                }
                return groups;
            },
        },
        created() {
            if (this.hideNotRequired) {
                this.hiddenFields = this.fields.filter(
                    (field) => this.shouldShowField(field) && !field.required,
                );
            }
        },
        methods: {
            showField(fieldName) {
                this.hiddenFields.splice(
                    this.hiddenFields.findIndex((field) => field.name === fieldName),
                    1,
                );
            },
            shouldShowField(field) {
                return !field.hidden && !(this.hideReadOnly && field.readOnly);
            },
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

<style>
    .fields-group:only-child {
        flex: 0 0 100%;
        max-width: 100%;
    }
</style>
