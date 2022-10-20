<template>
    <div class="card">
        <div v-if="showHeader" class="card-header">
            <h3 class="card-title">
                <template v-if="title">
                    {{ title }}
                </template>
                <slot v-else name="title" />
            </h3>
            <div class="card-tools">
                <slot name="tools" />
                <button
                    v-if="collapsable"
                    type="button"
                    class="btn btn-tool"
                    data-card-widget="collapse"
                    title="Collapse"
                >
                    <i class="fas fa-minus" />
                </button>
            </div>
        </div>
        <div class="card-body" :class="cardBodyClasses" style="display: block">
            <slot />
        </div>
        <div v-if="loading" class="overlay dark">
            <i class="fas fa-2x fa-spin fa-sync-alt" />
        </div>
    </div>
</template>

<script>
    export default {
        props: {
            title: { type: String, default: '' },
            collapsable: { type: Boolean, default: false },
            cardBodyClasses: { type: [String, Array], default: '' },
            loading: { type: Boolean, default: false },
        },
        computed: {
            showHeader() {
                return this.title || this.$slots.title || this.$slots.tools || this.collapsable;
            },
        },
    };
</script>

<style scoped>
    .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .card-header::after {
        display: none;
    }
    .card-tools {
        display: flex;
        align-items: center;
    }
</style>
