<template>
    <p
        :aria-labelledby="label_id"
        :aria-label="aria_label"
        style="white-space: pre-wrap"
        v-text="valueWithAdditionalText"
    />
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../base';
    export default {
        mixins: [BaseFieldContentReadonlyMixin],
    };
</script>
