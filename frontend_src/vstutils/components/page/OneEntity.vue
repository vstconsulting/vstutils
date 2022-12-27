<template>
    <div class="row">
        <component :is="beforeFieldsGroupsComponent" v-if="beforeFieldsGroupsComponent" :page="self" />
        <div :class="modelsFieldsWrapperClasses">
            <ModelFields
                v-if="response"
                :data="data"
                :model="model"
                :editable="!readOnly"
                :fields-groups="fieldsGroups"
                :fields-errors="fieldsErrors"
                :hide-read-only="hideReadOnly"
                :hide-not-required="hideNotRequired"
                :require-value-on-clear="requireValueOnClear"
                @set-value="setFieldValue"
            />
        </div>
        <component :is="afterFieldsGroupsComponent" v-if="afterFieldsGroupsComponent" :page="self" />
    </div>
</template>

<script>
    import { BaseViewMixin } from '../BaseViewMixin.ts';
    import HideNotRequiredSelect from './HideNotRequiredSelect';
    import ModelFields from './ModelFields.vue';
    import Card from '../Card.vue';
    import { mapStoreActions, mapStoreState, ViewTypes } from '../../utils';

    export default {
        name: 'OneEntity',
        components: { ModelFields, HideNotRequiredSelect, Card },
        mixins: [BaseViewMixin],
        data() {
            return {
                readOnly: this.view.type === ViewTypes.PAGE,
                hideReadOnly: this.view.hideReadonlyFields,
                hideNotRequired: false,
            };
        },
        computed: {
            requireValueOnClear() {
                if (this.view.isEditPage() && this.view.isPartial) {
                    return true;
                }
                return false;
            },
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
            fieldsGroups() {
                return undefined;
            },
            data() {
                return this.store.sandbox;
            },
            ...mapStoreState(['fieldsErrors', 'model', 'instance']),
        },
        methods: {
            fieldsGroupClasses(name) {
                return ['col-md-6', 'fields-group', `fields-group-${name.replace(/ /g, '_')}`];
            },
            ...mapStoreActions(['setFieldValue']),
        },
    };
</script>
