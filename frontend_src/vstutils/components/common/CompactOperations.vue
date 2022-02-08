<template>
    <div class="dropdown">
        <button
            :id="buttonId"
            class="btn btn-secondary dropdown-toggle"
            type="button"
            data-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
        >
            <i :class="icon" class="d-sm-none" />
            <span class="d-none d-sm-inline">{{ title }}</span>
        </button>
        <div class="dropdown-menu" :aria-labelledby="buttonId">
            <a
                v-for="op in operations"
                :key="op.name"
                class="dropdown-item"
                :class="`operation__${op.name}`"
                href="#"
                @click.prevent="$emit('clicked', op)"
            >
                <i v-if="op.iconClasses" :key="`op-${componentId}-i-${op.name}`" :class="op.iconClasses" />
                {{ $t(op.title) }}
            </a>
        </div>
    </div>
</template>

<script>
    import ComponentIDMixin from '../../ComponentIDMixin.js';

    export default {
        mixins: [ComponentIDMixin],
        props: {
            title: { type: String, required: true },
            icon: { type: String, required: true },
            view: { type: Object, required: true },
            operations: { type: Array, default: () => [] },
        },
        computed: {
            buttonId() {
                return `compact-operations-${this.componentId}`;
            },
        },
    };
</script>

<style scoped>
    @media (max-width: 576px) {
        .dropdown-toggle::after {
            content: none;
        }
    }
</style>
