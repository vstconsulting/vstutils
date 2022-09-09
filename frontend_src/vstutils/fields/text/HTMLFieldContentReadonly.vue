<template>
    <!-- eslint-disable vue/no-v-html -->
    <div
        class="scroll"
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
                class_list: ['html_content', 'rounded', 'text-data'],
            };
        },
        computed: {
            with_border() {
                if (this.value) {
                    return '';
                }

                return 'html_content_border';
            },
            classes() {
                return [].concat(this.class_list, this.with_border).join(' ');
            },
        },
    };
</script>

<style scoped>
    .scroll {
        overflow-x: auto;
    }
</style>
