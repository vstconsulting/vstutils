<template>
    <select :class="classes" :style="styles" :value="value"></select>
</template>

<script>
    import $ from 'jquery';
    import { deepEqual, trim, guiLocalSettings } from '../../../utils';
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
                let search_str = trim(params.data.term);
                let props = this.field.options.additionalProperties;
                let filters = {
                    limit: guiLocalSettings.get('page_size') || 20,
                    [this.field.getAutocompleteFilterName(this.data)]: search_str,
                };

                function getDependenceValueAsString(parent_data_object, field_name) {
                    if (!field_name || !parent_data_object.hasOwnProperty(field_name)) {
                        return undefined;
                    }
                    let field_dependence_name_array = [];
                    let filds_data_obj = parent_data_object[field_name];
                    for (let index = 0; index < filds_data_obj.length; index++) {
                        field_dependence_name_array.push(filds_data_obj[index].value);
                    }
                    return field_dependence_name_array.join(',');
                }
                let field_dependence_data = getDependenceValueAsString(
                    this.$parent.data,
                    props.field_dependence_name,
                );

                let format_data = {
                    fieldType: this.field.options.format,
                    modelName: this.queryset.model.name,
                    fieldName: this.field.options.name,
                };
                let p = this.querysets.map((qs) => {
                    let signal_obj = {
                        qs: qs,
                        filters: filters,
                    };
                    if (field_dependence_data !== undefined) {
                        signal_obj.field_dependence_name = props.field_dependence_name;
                        signal_obj.filter_name = props.filter_name;
                        signal_obj[props.field_dependence_name] = field_dependence_data;
                    }

                    window.tabSignal.emit(
                        'filter.{fieldType}.{modelName}.{fieldName}'.format(format_data),
                        signal_obj,
                    );

                    if (!signal_obj.hasOwnProperty('nest_prom')) {
                        return qs.filter(filters).items();
                    } else {
                        return signal_obj.nest_prom;
                    }
                });

                Promise.all(p)
                    .then((response) => {
                        let results = [];

                        if (this.field.options.default !== undefined) {
                            if (typeof this.field.options.default !== 'object') {
                                results.push({
                                    id: this.field.options.default,
                                    text: this.field.options.default,
                                });
                            } else {
                                results.push(this.field.options.default);
                            }
                        }

                        response.forEach((instances) => {
                            instances.forEach((instance) => {
                                let a_data = this.field.getAutocompleteValue(this.data, instance.data);
                                results.push({
                                    id: a_data.value_field,
                                    text: a_data.view_field,
                                });
                            });
                        });

                        success({ results: results });
                    })
                    .catch((error) => {
                        console.error(error);

                        let results = [];

                        if (props.default_value) {
                            results.push(props.default_value);
                        }

                        failure(results);
                    });
            },
        },
    };
</script>

<style scoped></style>
