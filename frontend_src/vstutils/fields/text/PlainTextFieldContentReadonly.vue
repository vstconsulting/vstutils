<template>
    <div
        :class="classes"
        :style="styles"
        v-html="value"
        :aria-labelledby="label_id"
        :aria-label="aria_label"
    ></div>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../base';
    export default {
        mixins: [BaseFieldContentReadonlyMixin],
        data() {
            return {
                class_list: ['text-data'],
                styles_dict: { whiteSpace: 'pre-wrap' },
            };
        },
    };
</script>

<style scoped></style>
