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
            {{ title }}
        </button>
        <div class="dropdown-menu" :aria-labelledby="buttonId">
            <a
                v-for="op in operations"
                :key="op.name"
                class="dropdown-item"
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
