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
        <div v-if="hideNotRequired" class="form-group col-lg-4 col-xs-12 col-sm-6 col-md-6">
            <label class="control-label">{{ ($t('add') + ' ' + $t('field')) | capitalize }}</label>
            <select
                id="show_not_required_fields_select"
                class="form-control"
                @change.prevent="addFieldHandler"
            >
                <option disabled selected>
                    {{ ($t('select') + ' ' + $t('field')) | capitalize }}
                </option>
                <option
                    v-for="(field, idx) in fields"
                    :key="idx"
                    :value="field.name"
                    :disabled="field.required"
                >
                    {{ $t(field.title) }}
                </option>
            </select>
        </div>

        <div class="row">
            <component :is="beforeFieldsGroupsComponent" v-if="beforeFieldsGroupsComponent" />
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
                            @toggle-hidden="toggleHidden"
                            @set-value="setFieldValue"
                        />
                    </div>
                </div>
            </div>
            <component :is="afterFieldsGroupsComponent" v-if="afterFieldsGroupsComponent" />
        </div>
    </EntityView>
</template>

<script>
    import PageWithDataMixin from '../../views/mixins/PageWithDataMixin.js';
    import ViewWithAutoUpdateMixin from '../../views/mixins/ViewWithAutoUpdateMixin.js';
    import { RequestTypes } from '../../utils';
    import EntityView from '../common/EntityView.vue';
    import { BaseViewMixin } from '../BaseViewMixin.js';

    export default {
        name: 'OneEntity',
        components: { EntityView },
        mixins: [BaseViewMixin, PageWithDataMixin, ViewWithAutoUpdateMixin],
        data() {
            return {
                readOnly: false,
                hideNotRequired: false,
                hideReadOnly: false,
                hiddenStore: {},
            };
        },
        computed: {
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
                        .filter(Boolean)
                        .filter(this.shouldShowField);
                    if (fields.length) groups[groupName] = fields;
                }
                return groups;
            },
        },
        created() {
            if (this.hideNotRequired) {
                for (const field of this.fields) {
                    Vue.set(this.hiddenStore, field.name, !field.options.required);
                }
            }
        },
        methods: {
            shouldShowField(field) {
                return (
                    !field.hidden && !(this.hideReadOnly && field.readOnly) && !this.hiddenStore[field.name]
                );
            },
            /**
             * Method - onChange handler of <select>Add field</select>.
             * @param {Event} event.
             */
            addFieldHandler(event) {
                event.target.selectedIndex = 0;
                this.toggleHidden(event.target.value);
            },
            /**
             * Method, that changes field's value in hidden_store.
             * @param {string} field - Name of the field.
             */
            toggleHidden(field) {
                this.hiddenStore[field] = !this.hiddenStore[field];
            },
            /**
             * Updates field value in store
             * @param {Object} obj
             * @param {string} obj.field
             * @param {any} obj.value
             */
            // eslint-disable-next-line no-unused-vars
            setFieldValue(obj) {
                this.commitMutation('setFieldValue', obj);
            },
            fieldsGroupClasses(name) {
                return ['col-md-6', 'fields-group', `fields-group-${name}`];
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
