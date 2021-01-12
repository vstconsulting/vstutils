<template>
    <EntityView
        :breadcrumbs="breadcrumbs"
        :error="error"
        :loading="loading"
        :response="response"
        :title="title"
        :view="view"
        :actions="actions"
        :sublinks="sublinks"
        :show-back-button="showBackButton"
        @execute-action="executeAction($event, instance)"
        @open-sublink="openSublink($event, instance)"
    >
        <div class="container-fluid fields-wrapper">
            <div class="row">
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
                            :value="field.options.name"
                            :disabled="field.options.required"
                        >
                            {{ $t(field.title) }}
                        </option>
                    </select>
                </div>

                <div
                    v-for="(fields, groupName) in fieldsGroups"
                    :key="groupName"
                    class="col-12 card fields-group"
                >
                    <h5 v-if="groupName" class="card-header" v-text="groupName" />
                    <div class="card-body">
                        <div class="row">
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
            </div>
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
            showBackButton() {
                return true;
            },
            model() {
                return this.view.objects.getModelClass(RequestTypes.RETRIEVE);
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
            // /**
            //  * Method, that defines: hide field or not.
            //  * @param {object} field Field object.
            //  * @return {boolean}
            //  */
            // hideFieldOrNot(field) {
            //     if (this.data[field.name] !== undefined) {
            //         return false;
            //     }
            //     return this.hiddenStore[field.name];
            // },
            // /**
            //  * Method, that returns wrapper_opt prop for each field.
            //  * @param {object} field Field object.
            //  */
            // getFieldWrapperOpt(field) {
            //     let w_opt = $.extend(true, {}, { qs_url: this.qs_url });
            //
            //     if (this.hideNotRequired) {
            //         let hidden = this.hideFieldOrNot(field);
            //         $.extend(true, w_opt, {
            //             hidden: hidden,
            //             hidden_button: true,
            //         });
            //     }
            //
            //     if (this.datastore && this.datastore.data.sandbox) {
            //         w_opt.use_prop_data = true;
            //     }
            //
            //     return w_opt;
            // },
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
        },
    };
</script>
