<template>
    <div>
        <template v-if="value && value.content">
            <image_block :field="field" :wrapper_opt="wrapper_opt" :data="data" :value="value" />
        </template>
        <template v-else>
            {{ val }}
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
