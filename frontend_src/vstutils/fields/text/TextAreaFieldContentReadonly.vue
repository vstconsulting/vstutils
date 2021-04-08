<template>
    <p :aria-labelledby="label_id" :aria-label="aria_label">
        {{ value }}
    </p>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../base';
    export default {
        mixins: [BaseFieldContentReadonlyMixin],
    };
</script>
