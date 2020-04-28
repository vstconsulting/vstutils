<template>
    <select name="values[]" :class="classes" :style="styles"></select>
</template>

<script>
    import $ from 'jquery';
    import { deepEqual } from '../../utils';
    import { FKFieldContentEditable } from '../fk/fk';

    export default {
        mixins: [FKFieldContentEditable],
        methods: {
            /**
             * Method, that mounts select2 to current field's select.
             */
            initSelect2() {
                $(this.select_el)
                    .select2({
                        width: '100%',
                        multiple: true,
                        ajax: {
                            delay: 350,
                            transport: (params, success, failure) => {
                                this.transport(params, success, failure);
                            },
                        },
                    })
                    .on('change', (event) => {
                        /* jshint unused: false */
                        let data = $(this.select_el).select2('data');
                        let val_arr = [];

                        if (data) {
                            val_arr = data.map((item) => {
                                return {
                                    value: item.id,
                                    prefetch_value: item.text,
                                };
                            });
                        }

                        if (!deepEqual(val_arr, this.value)) {
                            this.$emit('proxyEvent', 'setValueInStore', val_arr);
                        }
                    });
            },

            setValue(value) {
                if (!value) {
                    return $(this.select_el).val(null).trigger('change');
                }

                let val = value;

                if (typeof val == 'string') {
                    val = val.split(this.field.options.additionalProperties.view_separator);
                }

                if (Array.isArray(val)) {
                    $(this.select_el).html(null);

                    val.forEach((item) => {
                        if (typeof item == 'object') {
                            $(this.select_el).append(
                                new Option(item.prefetch_value, item.value, false, true),
                            );
                        } else {
                            $(this.select_el).append(new Option(item, item, false, true));
                        }
                    });

                    $(this.select_el).trigger('change');
                }
            },
        },
    };
</script>

<style scoped></style>
