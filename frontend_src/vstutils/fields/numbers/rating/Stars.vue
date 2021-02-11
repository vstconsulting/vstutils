<template>
    <div class="rating" :style="{ color, cursor: edit ? 'pointer' : 'auto' }" :title="selectedValue">
        <div v-for="star in icons" :key="star.value" class="rating-icon" v-on="handlers(star)">
            <i :class="star.leftClass" />
            <i :class="star.rightClass + ' fa-flip-horizontal'" />
        </div>
    </div>
</template>

<script>
    import FaIcon from './FaIcon.vue';

    export default {
        name: 'RatingFieldReadonly',
        mixins: [FaIcon],
        computed: {
            selectedValue() {
                return this.hoverValue || this.value;
            },
            activeIcon() {
                return 'fas fa-star-half';
            },
            inactiveIcon() {
                return 'far fa-star-half';
            },
            icons() {
                const icons = [];
                for (let value = 1; value - 1 < this.field.max; value++) {
                    icons.push({
                        value,
                        leftClass: this.selectedValue >= value - 0.5 ? this.activeIcon : this.inactiveIcon,
                        rightClass: this.selectedValue >= value ? this.activeIcon : this.inactiveIcon,
                    });
                }
                return icons;
            },
        },
    };
</script>

<style scoped>
    .rating {
        display: flex;
        flex-wrap: wrap;
        --icon-size: 1.8rem;
        --margin-coeff: 0.09; /* Magic number, do not change! */
        --right-icon-margin: calc(var(--icon-size) * var(--margin-coeff));
    }
    .rating-icon {
        display: flex;
        flex-wrap: nowrap;
        font-size: var(--icon-size);
    }
    .rating-icon i,
    .rating-icon i::before {
        display: inline-block;
        width: calc(var(--icon-size) / 2);
    }
    .rating-icon i:nth-child(2) {
        margin-left: var(--right-icon-margin);
    }
</style>

<style>
    .column-format-rating .rating {
        --icon-size: 0.9rem;
    }
</style>
