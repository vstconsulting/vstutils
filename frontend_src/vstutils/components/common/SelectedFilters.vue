<template>
    <div class="selected-filters">
        <span v-for="pill in pills" :key="pill.name" class="badge rounded-pill pill">
            <span class="pill__text">{{ $t(pill.title) }}: {{ $t(pill.value) }}</span>
            <i class="fa fa-times" @click="clearFilter(pill.name)" />
        </span>
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
                isMounted: false,
            };
        },
        computed: {
            fields() {
                return this.view.filters;
            },
            filters() {
                if (this.isMounted) {
                    return this.$root.$refs.currentViewComponent.filters || {};
                }
                return {};
            },
            activeFilters() {
                return Object.keys(this.filters).filter((filter) => !IGNORED_FILTERS.includes(filter));
            },
            pills() {
                return this.activeFilters.map((name) => ({
                    name,
                    title: this.fields[name].title,
                    value: this.filters[name],
                }));
            },
        },
        mounted() {
            this.isMounted = true;
        },
        methods: {
            clearFilter(name) {
                this.$root.$refs.currentViewComponent.applyFilters(
                    Object.fromEntries(Object.entries(this.filters).filter((entry) => entry[0] !== name)),
                );
            },
        },
    };
</script>

<style scoped>
    .pill {
        padding: 5px 7px 5px 10px;
        margin-right: 5px;
        background-color: var(--btn-selected-bg-color);
        color: var(--btn-selected-color);
        margin-bottom: 0.5rem;
    }
    .pill i {
        padding: 2px 3px;
        cursor: pointer;
    }
    .pill__text {
        display: inline-block;
        max-width: 200px;
        padding: 0 0 2px 0;
        margin: auto;
        white-space: nowrap;
        overflow: hidden;
        vertical-align: middle;
        text-overflow: ellipsis;
    }
</style>
