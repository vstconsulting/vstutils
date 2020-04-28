<template>
    <div style="display: contents;" v-show="!is_hidden">
        <component
            :is="'field_' + realField.options.format"
            :field="realField"
            :wrapper_opt="wrapper_opt"
            :prop_data="prop_data"
        ></component>
    </div>
</template>

<script>
    export default {
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
            };
        },
        created() {
            this.realField = this.field.getRealField(this.data);
            this.parent_values = this.field._getParentValues(this.data);
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
    };
</script>

<style scoped></style>
