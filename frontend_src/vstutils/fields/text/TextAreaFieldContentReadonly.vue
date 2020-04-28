<template>
    <div class="input-group">
        <textarea
            :value="value"
            rows="3"
            cols="50"
            :class="classes"
            :style="styles"
            disabled
            :aria-labelledby="label_id"
            :aria-label="aria_label"
        ></textarea>
    </div>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../base';
    export default {
        mixins: [BaseFieldContentReadonlyMixin],

        data() {
            return {
                styles_dict: { resize: 'vertical' },
            };
        },
    };
</script>

<style scoped></style>
