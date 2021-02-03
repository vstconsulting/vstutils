<template>
    <div :style="{ color, cursor: edit ? 'pointer' : 'auto' }" :title="value">
        <i v-for="icon in icons" :key="icon.value" :class="icon.class" v-on="handlers(icon)" />
    </div>
</template>

<script>
    import BaseRatingMixin from './BaseRatingMixin.js';

    export default {
        name: 'FaIcon',
        mixins: [BaseRatingMixin],
        data() {
            return {
                hoverValue: null,
            };
        },
        computed: {
            selectedValue() {
                return this.hoverValue || this.value;
            },
            roundedValue() {
                return Math.round(this.selectedValue);
            },
            color() {
                return this.field.color;
            },
            icons() {
                const icons = [];
                for (let value = 1; value < this.field.max + 1; value++) {
                    icons.push({
                        value,
                        class: this.field.faClass + (this.roundedValue >= value ? ' active' : ''),
                    });
                }
                return icons;
            },
        },
        methods: {
            handlers(icon) {
                if (!this.edit) {
                    return {};
                }

                return {
                    mouseenter: () => (this.hoverValue = icon.value),
                    mouseleave: () => (this.hoverValue = null),
                    click: () => this.$emit('change', icon.value),
                };
            },
        },
    };
</script>

<style scoped>
    i {
        font-size: 1.8rem;
        filter: opacity(0.5);
        margin-left: 2px;
    }
    i.active {
        filter: none;
    }
</style>

<style>
    .column-format-rating i {
        font-size: 0.9rem !important;
    }
</style>
