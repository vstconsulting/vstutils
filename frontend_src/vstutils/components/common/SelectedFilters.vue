<template>
    <div class="selected-filters">
        <span v-for="pill in pills" :key="pill.name" class="badge rounded-pill">
            {{ pill.title }}
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
                return this.activeFilters.map((name) => ({ name, title: this.fields[name].title }));
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
    .selected-filters span {
        padding: 5px;
        margin-left: 5px;
        background-color: var(--btn-selected-bg-color);
        color: var(--btn-selected-color);
    }
    .selected-filters span:first-of-type {
        margin-left: 0;
    }
    .selected-filters i {
        padding: 2px 3px;
        cursor: pointer;
    }
</style>
