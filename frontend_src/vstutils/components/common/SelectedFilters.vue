<template>
    <div class="selected-filters">
        <div v-for="pill in pills" :key="pill.name" class="badge rounded-pill pill mr-1 mb-1">
            <div class="d-flex align-items-center">
                <div class="mr-1">{{ $t(pill.title) }}:</div>
                <component
                    :is="pill.field.getComponent()"
                    :field="pill.field"
                    :data="sandbox"
                    type="readonly"
                    hide-title
                    class="mr-1"
                    @set-value="({ field, value }) => $set(sandbox, field, value)"
                />
                <i class="fa fa-times remove-icon" @click="clearFilter(pill.name)" />
            </div>
        </div>
    </div>
</template>

<script>
    import { IGNORED_FILTERS, ViewTypes } from '../../utils';

    export default {
        name: 'SelectedFilters',
        props: {
            view: { type: Object, required: true },
        },
        data() {
            return {
                isMounted: false,
                sandbox: {},
            };
        },
        computed: {
            fields() {
                return this.view?.filters || [];
            },
            filters() {
                if (this.isMounted) {
                    return this.$app.store.page.filters || {};
                }
                return {};
            },
            activeFilters() {
                if (this.view.type === ViewTypes.LIST) {
                    return Object.keys(this.filters).filter((filter) => !IGNORED_FILTERS.includes(filter));
                }
                return [];
            },
            representFields() {
                return Object.values(this.fields).reduce((obj, field) => {
                    obj[field.name] = field.toRepresent(this.filters);
                    return obj;
                }, {});
            },
            pills() {
                return this.activeFilters.reduce((arr, name) => {
                    const field = this.fields[name];
                    if (field) {
                        arr.push({
                            name,
                            field,
                            title: this.fields[name].title,
                        });
                    }
                    return arr;
                }, []);
            },
        },
        watch: {
            representFields: {
                handler(value) {
                    this.sandbox = value;
                },
                immediate: true,
            },
        },
        mounted() {
            this.isMounted = true;
        },
        methods: {
            clearFilter(name) {
                this.$app.store.page.applyFilters(
                    Object.fromEntries(Object.entries(this.filters).filter((entry) => entry[0] !== name)),
                );
            },
        },
    };
</script>

<style scoped>
    .pill {
        padding: 5px 7px 5px 10px;
        background-color: var(--btn-selected-bg-color);
        color: var(--btn-selected-color);
    }

    .pill .remove-icon {
        padding: 2px 3px;
        cursor: pointer;
    }
</style>

<style lang="scss">
    .pill .boolean-select {
        padding: 0 2px;
        margin-bottom: -6px;
        margin-top: -6px;
        .fa {
            padding: 0;
        }
    }
</style>
