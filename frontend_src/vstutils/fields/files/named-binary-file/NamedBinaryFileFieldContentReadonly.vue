<template>
    <div>
        <input :class="classes" :styles="styles" disabled :value="val" />
    </div>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../../base';
    import NamedBinaryFileFieldContent from './NamedBinaryFileFieldContent.js';

    export default {
        mixins: [BaseFieldContentReadonlyMixin, NamedBinaryFileFieldContent],
    };
</script>

<style scoped></style>
