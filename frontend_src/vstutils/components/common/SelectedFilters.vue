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
                <i v-if="pill.clearable" class="icon remove-icon" @click="clearFilter(pill.name)">&times;</i>
                <span v-else>({{ $t('default') }})</span>
            </div>
        </div>
    </div>
</template>

<script>
    import { IGNORED_FILTERS } from '../../utils';

    export default {
        name: 'SelectedFilters',
        props: {
            view: { type: Object, required: true },
        },
        data() {
            return {
                sandbox: {},
            };
        },
        computed: {
            fields() {
                if (this.view.isListPage()) {
                    return this.view.filters || {};
                }
                if (this.view.isDetailPage() && this.view.filtersModelClass) {
                    return Object.fromEntries(this.view.filtersModelClass.fields);
                }
                return {};
            },
            filters() {
                return this.$app.store.page.filters || {};
            },
            appliedDefaults() {
                if (this.view.isDetailPage() && this.view.filtersModelClass) {
                    return this.$app.store.page.appliedDefaultFilterNames || [];
                }
                return [];
            },
            activeFilters() {
                if (this.view.isListPage()) {
                    return Object.keys(this.filters).filter((filter) => !IGNORED_FILTERS.includes(filter));
                }
                if (this.view.isDetailPage()) {
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
                            clearable: !this.appliedDefaults.includes(name),
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
        methods: {
            clearFilter(name) {
                this.$app.store.page.applyFilters(
                    Object.fromEntries(
                        Object.entries(this.filters).filter(
                            (entry) => entry[0] !== name && !this.appliedDefaults.includes(entry[0]),
                        ),
                    ),
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

    .pill .icon {
        font-size: 1rem;
    }

    .pill .remove-icon {
        padding: 0 3px;
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
