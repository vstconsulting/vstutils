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
                validIds: [],
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
                this.setEnum(this.data[this.field.fieldForEnum]);
                this.$watch(
                    function () {
                        return this.data[this.field.fieldForEnum];
                    },
                    function (newVal) {
                        this.setEnum(newVal);
                        this.initSelect2();
                    },
                );
            } else {
                this.setEnum(this.field.enum);
                this.$watch(
                    function () {
                        return this.field.enum;
                    },
                    function (newVal) {
                        this.setEnum(newVal);
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
            setEnum(newEnum) {
                this.enum = this.field.prepareEnumData(newEnum);
                for (const item of this.enum) {
                    item.text = this.$parent.translateValue(item.text);
                }
                this.validIds = this.enum.map((value) => value.id);
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
                        templateResult: this.field.templateResult,
                        templateSelection: this.field.templateSelection,
                    })
                    .on('change', (event) => {
                        let value;
                        let data = $(this.s2).select2('data')[0];

                        if (data && data.id) {
                            value = data.id;
                        } else {
                            value = event.target.value || null;
                        }

                        if (!this.validIds.includes(value) && value) {
                            this.setValue(this.validIds[0] || null);
                            return;
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
                } else {
                    this.setValue(this.enum[0] || null);
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
