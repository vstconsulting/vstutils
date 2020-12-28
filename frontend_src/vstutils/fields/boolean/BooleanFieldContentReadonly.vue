<template>
    <div
        :class="classes"
        :style="styles"
        onselectstart="return false"
        onmousedown="return false"
        :aria-labelledby="label_id"
        :aria-label="aria_label"
    >
        <div class="ico-on fa fa-toggle-on" />
        <div class="ico-off fa fa-toggle-off" />
        <div class="boolean-title">{{ $t(text) | capitalize }}</div>
    </div>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../base';
    import BooleanFieldContentMixin from './BooleanFieldContentMixin.js';

    export default {
        mixins: [BaseFieldContentReadonlyMixin, BooleanFieldContentMixin],
        computed: {
            additional_classes() {
                return ['boolean-select_disabled'];
            },
        },
    };
</script>

<style scoped>
    .boolean-title {
        display: inline-block;
        position: absolute;
        padding-left: 10px;
        padding-top: 4px;
    }
    .boolean-select_disabled {
        background-color: #eaedf0;
        cursor: not-allowed;
    }
</style>
