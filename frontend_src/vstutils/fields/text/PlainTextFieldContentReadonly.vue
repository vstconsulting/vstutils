<template>
    <!-- eslint-disable vue/no-v-html -->
    <div
        :class="classes"
        :style="styles"
        :aria-labelledby="label_id"
        :aria-label="aria_label"
        v-html="value"
    />
    <!--eslint-enable-->
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
