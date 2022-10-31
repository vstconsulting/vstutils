<template>
    <div class="input-group">
        <div
            :class="classes"
            :style="styles"
            onselectstart="return false"
            onmousedown="return false"
            :aria-labelledby="label_id"
            :aria-label="aria_label"
            @click="$emit('set-value', !value)"
        >
            <div class="ico-on fa fa-toggle-on" />
            <div class="ico-off fa fa-toggle-off" />
        </div>
        <HideButton v-if="hasHideButton" @click.native="$emit('hide-field', field)" />
        <ClearButton @click.native="clearValue" />
    </div>
</template>

<script>
    import { BaseFieldContentEdit } from '../base';
    import BooleanFieldContentMixin from './BooleanFieldContentMixin.js';

    export default {
        mixins: [BaseFieldContentEdit, BooleanFieldContentMixin],
    };
</script>

<style scoped>
    .boolean-title {
        display: inline-block;
        position: absolute;
        padding-left: 10px;
        padding-top: 4px;
    }
</style>
