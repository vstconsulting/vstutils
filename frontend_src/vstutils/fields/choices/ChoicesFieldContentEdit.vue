<template>
    <select
        :class="classes"
        :style="styles"
        :value="value"
        :aria-labelledby="label_id"
        :aria-label="aria_label"
    />
</template>

<script>
    import $ from 'jquery';
    import { BaseFieldContentEdit } from '../base';

    export default {
        mixins: [BaseFieldContentEdit],
        data() {
            return {
                /**
                 * Property, that stores select2 DOM element.
                 */
                s2: undefined,
                class_list: ['form-control', 'select2', 'select2-field-select'],
                enum: [],
            };
        },
        computed: {
            disableIfEmpty() {
                if (this.field.fieldForEnum !== undefined) {
                    return this.field.fieldForEnum;
                }
                return false;
            },
        },
        watch: {
            value(value) {
                this.setValue(value);
            },
        },
        mounted() {
            this.s2 = $(this.$el);

            if (this.field.fieldForEnum) {
                this.enum = this.prepareFieldData(this.data[this.field.fieldForEnum]);
                this.$watch(
                    function () {
                        return this.data[this.field.fieldForEnum];
                    },
                    function (newVal) {
                        this.enum = this.prepareFieldData(newVal);
                        this.initSelect2();
                    },
                );
            } else {
                this.enum = this.field.enum;
                this.$watch(
                    function () {
                        return this.field.enum;
                    },
                    function (newVal) {
                        this.enum = newVal || [];
                        this.initSelect2();
                    },
                );
            }

            this.initSelect2();
        },
        destroyed() {
            $(this.$el).off().select2('destroy');
        },
        methods: {
            prepareFieldData(data) {
                if (typeof data === 'string' && data.length > 0) {
                    return data.split(',');
                } else if (Array.isArray(data)) {
                    return data.map((v) => (typeof v === 'object' ? v.value || v.prefetch_value : v));
                } else if (typeof data === 'object') {
                    return [data.value || data.prefetch_value];
                }
                return [];
            },
            /**
             * Method, that mounts select2 to current field's select.
             */
            initSelect2() {
                $(this.s2)
                    .empty() // Remove all children (options)
                    .select2({
                        theme: window.SELECT2_THEME,
                        width: '100%',
                        data: this.enum,
                        disabled: this.field.disabled || (this.disableIfEmpty && this.enum.length === 0),
                        allowClear: this.field.nullable,
                        placeholder: { id: undefined, text: '' },
                    })
                    .on('change', (event) => {
                        let value;
                        let data = $(this.s2).select2('data')[0];

                        if (data && data.id) {
                            value = data.id;
                        } else {
                            value = event.target.value || null;
                        }

                        if (!this.enum.includes(value)) {
                            value = this.enum[0] || null;
                        }
                        if (this.value !== value) {
                            this.$emit('set-value', value);
                        }
                    });

                // Set initial value
                if (this.value) {
                    this.setValue(this.value);
                } else if (this.field.hasDefault) {
                    this.setValue(this.field.default);
                }
            },
            /**
             * Method, that sets value to select2 DOM element.
             * @param {string} value.
             */
            setValue(value) {
                $(this.s2).val(value).trigger('change');
            },
        },
    };
</script>

<style scoped></style>
