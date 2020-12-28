<template>
    <table class="table table-bordered multiple-select">
        <thead>
            <tr>
                <th style="width: 50px;"></th>

                <th v-for="(field, idx) in fields" :key="idx">
                    {{ $t((field.options.title || field.options.name).toLowerCase()) | capitalize | split }}
                </th>
            </tr>
        </thead>
        <tbody>
            <fma_table_row
                v-for="(instance, idx) in instances"
                :key="idx"
                :qs="qs"
                :instance="instance"
                :fields="fields"
                :field_props="field_props"
                :field_value="field_value"
                @change-value="changeValue"
            ></fma_table_row>
        </tbody>
    </table>
</template>

<script>
    import FKMultiAutocompleteFieldTableRow from './FKMultiAutocompleteFieldTableRow.vue';

    /**
     * Mixin for table, that is used in fk_multi_autocomplete modal.
     */
    export default {
        props: ['instances', 'qs', 'field_props', 'field_value'],
        computed: {
            fields() {
                return this.qs.model.fields;
            },
        },
        methods: {
            changeValue(opt) {
                this.$emit('change-value', opt);
            },
        },
        components: {
            fma_table_row: FKMultiAutocompleteFieldTableRow,
        },
    };
</script>

<style scoped></style>
