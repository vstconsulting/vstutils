<template>
    <select name="values[]" :class="classes" :style="styles" />
</template>

<script>
    import $ from 'jquery';
    import { deepEqual } from '../../utils';
    import { FKFieldContentEditable } from '../fk/fk';

    export default {
        mixins: [FKFieldContentEditable],
        beforeMount() {
            if (this.value && !this.field.fetchData) {
                this.fetchedValue = this.value;
            }
        },
        methods: {
            /**
             * Method, that mounts select2 to current field's select.
             */
            initSelect2() {
                $(this.$el)
                    .select2({
                        theme: window.SELECT2_THEME,
                        width: '100%',
                        multiple: true,
                        ajax: {
                            delay: 350,
                            transport: (params, success, failure) => {
                                this.transport(params, success, failure);
                            },
                        },
                    })
                    .on('change', () => {
                        let data = $(this.$el).select2('data');
                        let newValue = data
                            ? data.map((item) => ({ value: item.id, prefetch_value: item.text }))
                            : [];

                        if (!deepEqual(newValue, this.value) && !this.isSameValues(newValue, this.value)) {
                            this.$emit('set-value', newValue);
                        }
                    });
            },

            isSameValues(first, second) {
                if (Array.isArray(first)) {
                    first = first.map((item) => (typeof item === 'object' ? item.value : item)).join(',');
                }
                if (Array.isArray(second)) {
                    second = second.map((item) => (typeof item === 'object' ? item.value : item)).join(',');
                }
                return first === second;
            },

            setValue(value) {
                if (!value) {
                    return $(this.$el).val(null).trigger('change');
                }

                let val = value;

                if (typeof val == 'string') {
                    val = val.split(this.field.viewSeparator);
                }

                if (Array.isArray(val)) {
                    $(this.$el).html(null);

                    val.forEach((item) => {
                        if (typeof item == 'object') {
                            $(this.$el).append(new Option(item.prefetch_value, item.value, false, true));
                        } else {
                            $(this.$el).append(new Option(item, item, false, true));
                        }
                    });

                    $(this.$el).trigger('change');
                }
            },
        },
    };
</script>
