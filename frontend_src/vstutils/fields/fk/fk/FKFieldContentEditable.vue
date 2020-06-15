<template>
    <select :class="classes" :style="styles" :value="value"></select>
</template>

<script>
    import $ from 'jquery';
    import { deepEqual, trim, guiLocalSettings, getDependenceValueAsString } from '../../../utils';
    import { BaseFieldContentEdit } from '../../base';
    import FKFieldContent from './FKFieldContent.js';

    export default {
        mixins: [BaseFieldContentEdit, FKFieldContent],
        data() {
            return {
                class_list: ['form-control', 'select2', 'select2-field-select'],
            };
        },
        mounted() {
            this.select_el = $(this.$el);

            this.initSelect2();

            if (this.value) {
                this.setValue(this.value);
            }

            this.pageSize = guiLocalSettings.get('page_size') || 20;
            this.currentQuerysetIdx = 0;
            this.currentQuerysetOffset = 0;
        },
        watch: {
            value(value) {
                this.setValue(value);
            },
        },
        methods: {
            /**
             * Method, that mounts select2 to current field's select.
             */
            initSelect2() {
                $(this.select_el)
                    .select2({
                        width: '100%',
                        ajax: {
                            delay: 350,
                            transport: (params, success, failure) => {
                                this.transport(params, success, failure);
                            },
                        },
                    })
                    .on('change', (event) => {
                        let data = $(this.select_el).select2('data')[0];
                        let val_obj = {};

                        if (data) {
                            val_obj.value = data.id;
                            val_obj.prefetch_value = data.text;
                        } else {
                            val_obj.value = event.target.value;
                            val_obj.prefetch_value = event.target.value;
                        }

                        if (!deepEqual(val_obj, this.value)) {
                            this.$emit('proxyEvent', 'setValueInStore', val_obj);
                        }
                    });
            },

            setValue(value) {
                if (!value) {
                    return $(this.select_el).val(null).trigger('change');
                }

                if (typeof value !== 'object') {
                    value = {
                        value: value,
                        prefetch_value: value,
                    };
                }

                let result = {
                    id: value.value,
                    text: value.prefetch_value,
                };

                let newOption = new Option(result.text, result.id, false, true);

                $(this.select_el).append(newOption).trigger('change');
            },

            transport(params, success, failure) {
                if (this.querysets.length === 0) {
                    success({ results: [] });
                    return;
                }

                const searchTerm = trim(params.data.term);

                if (params.data._type === 'query') {
                    this.currentQuerysetIdx = 0;
                    this.currentQuerysetOffset = 0;
                }

                const queryset = this.querysets[this.currentQuerysetIdx];

                this.getQuerysetResults(searchTerm, this.currentQuerysetOffset, queryset)
                    .then(({ items, total }) => {
                        // If we have no more items in current queryset
                        if (this.currentQuerysetOffset + this.pageSize >= total) {
                            // If we have no more querysets
                            if (this.currentQuerysetIdx + 1 >= this.querysets.length) {
                                success({ results: items });
                            } else {
                                this.currentQuerysetOffset = 0;
                                this.currentQuerysetIdx += 1;
                                success({ results: items, pagination: { more: true } });
                            }
                        } else {
                            this.currentQuerysetOffset += this.pageSize;
                            success({ results: items, pagination: { more: true } });
                        }
                    })
                    .catch((error) => {
                        console.error(error);
                        const default_value = this.field.options.additionalProperties.default_value;
                        failure(default_value ? [default_value] : []);
                    });
            },
            /**
             * Method to make query to one queryset with given search term and offset
             *
             * @param {string} searchTerm
             * @param {number} offset
             * @param {QuerySet} queryset
             * @return {Promise<{items: Array, total: number}>}
             */
            getQuerysetResults(searchTerm, offset, queryset) {
                const props = this.field.options.additionalProperties;
                let filters = {
                    limit: this.pageSize,
                    offset: offset,
                    [this.field.getAutocompleteFilterName(this.data)]: searchTerm,
                };

                let signal_obj = {
                    qs: queryset,
                    filters: filters,
                };

                let field_dependence_data = getDependenceValueAsString(
                    this.$parent.data,
                    props.field_dependence_name,
                );
                if (field_dependence_data !== undefined) {
                    signal_obj.field_dependence_name = props.field_dependence_name;
                    signal_obj.filter_name = props.filter_name;
                    signal_obj[props.field_dependence_name] = field_dependence_data;
                }

                window.tabSignal.emit(
                    `filter.${this.field.options.format}.${this.queryset.model.name}.${this.field.options.name}`,
                    signal_obj,
                );

                const req = signal_obj.nest_prom || queryset.filter(filters).items();

                return req.then((response) => {
                    const items = response.map((instance) => {
                        let a_data = this.field.getAutocompleteValue(this.data, instance.data);
                        return { id: a_data.value_field, text: a_data.view_field };
                    });

                    if (this.field.options.default !== undefined) {
                        if (typeof this.field.options.default !== 'object') {
                            items.push({
                                id: this.field.options.default,
                                text: this.field.options.default,
                            });
                        } else {
                            items.push(this.field.options.default);
                        }
                    }

                    return { items: items, total: response.total };
                });
            },
        },
    };
</script>

<style scoped></style>
