<template>
    <div v-show="!is_hidden" style="display: contents;">
        <component
            :is="'field_' + realField.options.format"
            :field="realField"
            :prop_data="_prop_data"
            :datastore="datastore"
            :wrapper_opt="{ ...wrapper_opt, hidden }"
            @toggleHidden="toggleHidden"
            @update-value="updateFieldValue"
        />
    </div>
</template>

<script>
    export default {
        inject: { updateFieldValue: { default: () => () => {} } },
        props: ['prop_data'],
        data() {
            return {
                /**
                 * Property, that stores real field of current dynamic field.
                 */
                realField: undefined,
                /**
                 * Property, that stores previous instance of real field of current dynamic field.
                 */
                previous_realField: undefined,
                /**
                 * Property, that stores previous parent values.
                 * It's needed for optimization of realField regeneration.
                 */
                parent_values: {},
                hidden: false,
            };
        },
        computed: {
            _prop_data() {
                if (this.prop_data) {
                    return this.prop_data;
                }

                if (this.datastore && this.datastore.data.sandbox) {
                    return this.datastore.data.sandbox;
                }

                return undefined;
            },
        },
        watch: {
            /**
             * Hook, that checks: is previous parent_values different from new data.
             * If they are different, realField will be regenerated.
             * @param {object} data New data.
             */
            data: function (data) {
                for (let key in this.parent_values) {
                    if (data[key] !== this.parent_values[key]) {
                        this.parent_values = this.field._getParentValues(data);
                        this.previous_realField = this.realField;
                        this.realField = this.field.getRealField(data);

                        if (this.realField.options && this.value !== undefined) {
                            if (this.realField.options.save_value === false) {
                                this.cleanValue();
                            } else if (this.realField.options.save_value === true) {
                                // TODO Remove this empty condidtion?
                            } else if (
                                this.previous_realField.options &&
                                this.realField.options.format !== this.previous_realField.options.format
                            ) {
                                this.cleanValue();
                            }
                        }
                    }
                }
            },
        },
        created() {
            this.realField = this.field.getRealField(this.data);
            this.parent_values = this.field._getParentValues(this.data);
        },
        methods: {
            toggleHidden() {
                this.hidden = !this.hidden;
            },
        },
    };
</script>

<style scoped></style>
