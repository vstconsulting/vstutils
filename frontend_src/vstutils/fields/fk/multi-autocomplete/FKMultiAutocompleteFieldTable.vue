<template>
    <table class="table table-bordered multiple-select">
        <thead>
            <tr>
                <th style="width: 50px" />

                <th v-for="(field, idx) in fields" :key="idx">
                    {{ $t(field.title) }}
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
                :field_props="fieldProps"
                :field_value="fieldValue"
                @change-value="changeValue"
            />
        </tbody>
    </table>
</template>

<script>
    import FKMultiAutocompleteFieldTableRow from './FKMultiAutocompleteFieldTableRow.vue';

    /**
     * Mixin for table, that is used in fk_multi_autocomplete modal.
     */
    export default {
        components: {
            fma_table_row: FKMultiAutocompleteFieldTableRow,
        },
        props: {
            instances: { type: Object, required: true },
            qs: { type: Object, required: true },
            fieldProps: { type: Object, required: true },
            fieldValue: { type: Object, required: true },
        },
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
    };
</script>
