<template>
    <div>
        <template v-if="value && value.content">
            <image_block :field="field" :wrapper_opt="wrapper_opt" :data="data" :value="value"></image_block>
        </template>
        <template v-else>
            <input :class="classes" :styles="styles" disabled :value="val" />
        </template>
    </div>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../../base';
    import { NamedBinaryFileFieldContent } from '../named-binary-file';
    import NamedBinaryImageFieldContent from './NamedBinaryImageFieldContent.js';

    export default {
        mixins: [BaseFieldContentReadonlyMixin, NamedBinaryFileFieldContent, NamedBinaryImageFieldContent],
    };
</script>

<style scoped></style>
