<template>
    <div class="row">
        <div v-if="hideNotRequired" class="col-12">
            <div class="card">
                <div class="card-body">
                    <HideNotRequiredSelect
                        class="col-lg-4 col-xs-12 col-sm-6 col-md-6"
                        :fields="hiddenFields"
                        @show-field="showField"
                    />
                </div>
            </div>
        </div>
        <div
            v-for="(group, idx) in filteredFieldsInstancesGroups"
            :key="idx"
            :class="fieldsGroupClasses(group.title)"
        >
            <div class="card" :class="groupsClasses">
                <h5 v-if="group.title" class="card-header">
                    {{ $t(group.title) }}
                </h5>
                <div class="card-body">
                    <component
                        :is="field.component"
                        v-for="field in group.fields"
                        :key="field.name"
                        :field="field"
                        :data="data"
                        :type="fieldsType"
                        :error="fieldsErrors[field.name]"
                        :hideable="hideNotRequired && !field.required"
                        style="margin-bottom: 1rem"
                        @hide-field="hiddenFields.push(field)"
                        @set-value="$emit('set-value', $event)"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import HideNotRequiredSelect from './HideNotRequiredSelect.vue';

    export default {
        name: 'ModelFields',
        components: { HideNotRequiredSelect },
        props: {
            data: { type: Object, required: true },
            model: { type: Function, required: true },

            fieldsGroups: {
                type: Array,
                default() {
                    if (this.model.fieldsGroups) {
                        return Object.entries(this.model.fieldsGroups).map(([groupName, fieldsNames]) => ({
                            title: groupName,
                            fields: fieldsNames,
                        }));
                    } else {
                        return [{ title: '', fields: Array.from(this.model.fields.values()) }];
                    }
                },
            },

            editable: { type: Boolean, default: false },
            hideReadOnly: { type: Boolean, default: false },
            hideNotRequired: { type: Boolean, default: false },

            fieldsErrors: { type: Object, default: () => ({}) },

            groupsClasses: { type: [String, Object, Array], default: '' },
        },
        data() {
            return {
                hiddenFields: [],
            };
        },
        computed: {
            fieldsType() {
                return this.editable ? 'edit' : 'readonly';
            },
            fieldsInstancesGroups() {
                const groups = [];
                for (const group of this.fieldsGroups) {
                    const fields = [];
                    for (const fieldName of group.fields) {
                        if (typeof fieldName === 'object') {
                            fields.push(fieldName);
                            continue;
                        }
                        const field = this.model.fields.get(fieldName);
                        if (field) {
                            fields.push(field);
                        } else {
                            console.warn(`Cannot resolve field ${this.model.name}.${fieldName} `);
                        }
                    }
                    if (fields.length > 0) {
                        groups.push({ ...group, fields });
                    }
                }
                return groups;
            },
            filteredFieldsInstancesGroups() {
                return this.fieldsInstancesGroups
                    .map((group) => ({
                        ...group,
                        fields: group.fields.filter((field) => this.shouldShowField(field)),
                    }))
                    .filter((group) => group.fields.length > 0);
            },
        },
        created() {
            if (this.hideNotRequired) {
                this.hiddenFields = this.filteredFieldsInstancesGroups
                    .flatMap((group) => group.fields)
                    .filter((field) => !field.required);
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
                return (
                    !field.hidden &&
                    !(this.hideReadOnly && field.readOnly) &&
                    !this.hiddenFields.includes(field)
                );
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
