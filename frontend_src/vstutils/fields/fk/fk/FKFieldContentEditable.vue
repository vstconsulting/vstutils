<template>
    <div class="input-group" style="flex-wrap: nowrap">
        <select ref="select" class="form-control" />
        <HideButton v-if="hasHideButton" @click.native="$emit('hide-field', field)" />
    </div>
</template>

<script>
    import $ from 'jquery';
    import { trim, guiLocalSettings, RequestTypes } from '../../../utils';
    import { BaseFieldContentEdit } from '../../base';
    import FKFieldContent from './FKFieldContent.js';
    import signals from '../../../signals.js';

    export default {
        mixins: [BaseFieldContentEdit, FKFieldContent],
        data() {
            return {
                class_list: ['form-control', 'select2', 'select2-field-select'],
            };
        },
        watch: {
            value(value) {
                this.setValue(value, false);
            },
        },
        mounted() {
            this.instancesCache = new Map();

            this.initSelect2();

            if (this.value) {
                this.setValue(this.value);
            }

            this.pageSize = guiLocalSettings.get('page_size') || 20;
            this.currentQuerysetIdx = 0;
            this.currentQuerysetOffset = 0;
        },
        beforeDestroy() {
            $(this.$refs.select).off().select2('destroy');
        },
        methods: {
            /**
             * Method, that mounts select2 to current field's select.
             */
            initSelect2() {
                $(this.$refs.select)
                    .select2({
                        theme: window.SELECT2_THEME,
                        width: '100%',
                        ajax: {
                            delay: 350,
                            transport: (params, success, failure) => {
                                this.transport(params, success, failure);
                            },
                        },
                        allowClear: this.field.nullable,
                        placeholder: { id: undefined, text: '' },
                    })
                    .on('change', () => {
                        const selected = $(this.$refs.select).select2('data')[0] || {};
                        const newValue =
                            selected.instance || this.instancesCache.get(String(selected.id)) || null;

                        if (!this.isSameValues(newValue, this.value)) {
                            this.$emit('set-value', newValue);
                        }
                    });
            },

            isSameValues(first, second) {
                return this.field.getValueFieldValue(first) === this.field.getValueFieldValue(second);
            },

            setValue(value) {
                if (!value) {
                    return $(this.$refs.select).val(null).trigger('change');
                }

                const selected = $(this.$refs.select).select2('data')[0] || {};
                const currentValue =
                    selected.instance || this.instancesCache.get(String(selected.id)) || null;

                if (this.isSameValues(currentValue, value)) {
                    return;
                }
                this.instancesCache.set(String(this.field.getValueFieldValue(value)), value);

                const newOption = new Option(
                    this.field.translateValue(value),
                    value[this.field.valueField] || value,
                    false,
                    true,
                );

                $(this.$refs.select).empty().append(newOption).trigger('change');
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
                        failure([]);
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
            async getQuerysetResults(searchTerm, offset, queryset) {
                const filters = { limit: this.pageSize, offset, [this.field.viewField]: searchTerm };
                if (this.field.filters) {
                    Object.assign(filters, this.field.filters);
                }

                const signalObj = {
                    qs: queryset,
                    filters: filters,
                    dependenceFilters: this.field.getDependenceFilters(this.data),
                };
                const model = this.queryset.getModelClass(RequestTypes.LIST);

                signals.emit(`filter.${this.field.format}.${model.name}.${this.field.name}`, signalObj);

                let req;

                if (signalObj.nest_prom) {
                    req = signalObj.nest_prom;
                } else if (signalObj.dependenceFilters !== null) {
                    req = queryset.filter({ ...filters, ...signalObj.dependenceFilters }).items();
                } else {
                    req = Promise.resolve([]);
                }

                const instances = await req;

                const items = instances.map((instance) => ({
                    id: instance[this.field.valueField],
                    text: this.field.translateValue(instance),
                    instance,
                }));

                if (this.field.hasDefault) {
                    if (typeof this.field.default !== 'object') {
                        items.push({
                            id: this.field.default,
                            text: this.field.translateValue(this.field.default),
                        });
                    } else {
                        items.push(this.field.default);
                    }
                }
                const total = instances.total !== undefined ? instances.total : items.length;
                return { items, total };
            },
        },
    };
</script>

<style scoped>
    .input-group::v-deep .select2-selection {
        width: 100%;
    }
</style>
