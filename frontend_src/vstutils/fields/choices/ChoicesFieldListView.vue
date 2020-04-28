<template>
    <div :class="classes" :style="styles">{{ value }}</div>
</template>

<script>
    import { BaseFieldListView } from '../base';
    import ChoicesFieldContentReadonly from './ChoicesFieldContentReadonly.vue';

    export default {
        mixins: [BaseFieldListView, ChoicesFieldContentReadonly],

        computed: {
            classes() {
                return [...this.class_list, this.choices_classes];
            },
        },
    };
</script>

<style></style>
