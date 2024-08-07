<template>
    <div :class="classes" :style="styles">
        <p :aria-labelledby="label_id" :aria-label="aria_label">
            {{ value }}
        </p>
    </div>
</template>

<script lang="ts">
    import { BaseFieldContentReadonlyMixin } from '#vstutils/fields/base';

    export default {
        mixins: [BaseFieldContentReadonlyMixin],
        data() {
            return {
                styles_dict: {},
            };
        },
    };
</script>
