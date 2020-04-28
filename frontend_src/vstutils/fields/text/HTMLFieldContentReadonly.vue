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

<style scoped></style>
