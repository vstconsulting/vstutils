<template>
    <a
        v-if="value"
        class="btn btn-secondary"
        :href="`data:application/octet-stream;base64,${value}`"
        :download="field.name"
    >
        <i class="fas fa-download" />
    </a>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../../base';
    export default {
        mixins: [BaseFieldContentReadonlyMixin],
    };
</script>
