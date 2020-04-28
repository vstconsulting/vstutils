<template>
    <div :class="classes" :style="styles">
        <p :aria-labelledby="label_id" :aria-label="aria_label">{{ value }}</p>
    </div>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../base';

    export default {
        mixins: [BaseFieldContentReadonlyMixin],
        data() {
            return {
                class_list: [],
                styles_dict: {},
            };
        },
    };
</script>

<style scoped></style>
