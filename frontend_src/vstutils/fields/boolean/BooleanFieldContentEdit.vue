<template>
    <div class="input-group">
        <div
            :class="classes"
            :style="styles"
            onselectstart="return false"
            onmousedown="return false"
            :aria-labelledby="label_id"
            @click="$emit('set-value', !value)"
            :aria-label="aria_label"
        >
            <div class="ico-on fa fa-toggle-on"></div>
            <div class="ico-off fa fa-toggle-off"></div>
        </div>
        <field_hidden_button
            v-if="hasHideButton"
            :field="field"
            @hideField="$emit('proxyEvent', 'hideField')"
        ></field_hidden_button>
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
