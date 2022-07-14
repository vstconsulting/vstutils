<template>
    <div v-show="!hidden" class="dropdown">
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
        <div ref="menu" class="dropdown-menu" :aria-labelledby="buttonId">
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
    import signals from '../../signals';
    import ComponentIDMixin from '../../ComponentIDMixin.js';

    export default {
        mixins: [ComponentIDMixin],
        props: {
            title: { type: String, required: true },
            icon: { type: String, required: true },
            view: { type: Object, required: true },
            operations: { type: Array, default: () => [] },
        },
        data() {
            return { hidden: false };
        },
        computed: {
            buttonId() {
                return `compact-operations-${this.componentId}`;
            },
        },
        mounted() {
            this.slot = signals.on({
                signal: 'pageDataUpdated',
                callback: () => {
                    this.$nextTick().then(() => {
                        setTimeout(() => {
                            this.hidden = this.isAllHidden();
                        }, 1);
                    });
                },
            });
        },
        beforeDestroy() {
            signals.disconnect(this.slot, 'pageDataUpdated');
        },
        methods: {
            isAllHidden() {
                if (this.$refs.menu) {
                    for (const child of this.$refs.menu.children) {
                        if (getComputedStyle(child).getPropertyValue('display') !== 'none') {
                            return false;
                        }
                    }
                }
                return true;
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
