<template>
    <p
        :aria-labelledby="label_id"
        :aria-label="aria_label"
        style="white-space: pre-wrap"
        v-text="preparedValue"
    />
</template>

<script lang="ts">
    import { BaseFieldContentReadonlyMixin } from '@/vstutils/fields/base';
    export default {
        extends: BaseFieldContentReadonlyMixin,
    };
</script>
