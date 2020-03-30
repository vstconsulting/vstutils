<template>
    <div class="container-fluid">
        <div class="row">
            <div
                v-for="(field, idx) in fieldsToshow"
                :key="idx"
                :field="field"
                :is="'field_' + field.options.format"
                v-model="data_to_represent[field.options.name]"
                :wrapper_opt="wrapper_opt"
            ></div>
        </div>
    </div>
</template>

<script>
    import $ from 'jquery';

    export default {
        name: 'filters_wrapper',
        props: ['view', 'opt', 'filters_data'],
        computed: {
            fieldsToshow() {
                return Object.values(this.filters).filter(
                    (field) => !(this.opt.hideReadOnly && field.options.readOnly),
                );
            },

            filters() {
                return this.view.schema.filters;
            },

            qs_url() {
                return this.opt.store_url;
            },

            data_to_represent() {
                return this.filters_data;
            },

            wrapper_opt() {
                return $.extend(true, {}, this.opt, { qs_url: this.qs_url });
            },
        },
    };
</script>

<style scoped></style>
