<template>
    <div class="card">
        <div class="card-header">
            <h3 class="card-title">
                <template v-if="title">
                    {{ title }}
                </template>
                <slot v-else name="title" />
            </h3>
            <div class="card-tools">
                <slot name="tools" />
                <button
                    v-if="isCollapsable"
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
    </div>
</template>

<script>
    export default {
        props: {
            title: { type: String, default: '' },
            isCollapsable: { type: Boolean, default: true },
            cardBodyClasses: { type: [String, Array], default: '' },
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
