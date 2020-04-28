<template>
    <div class="input-group">
        <div
            :class="classes"
            :style="styles"
            @click="$emit('proxyEvent', 'toggleValue')"
            onselectstart="return false"
            onmousedown="return false"
            :aria-labelledby="label_id"
            :aria-label="aria_label"
        >
            <div class="ico-on fa fa-toggle-on"></div>
            <div class="ico-off fa fa-toggle-off"></div>
            <div class="boolean-title">{{ $t(text) | capitalize }}</div>
        </div>
        <field_hidden_button
            v-if="with_hidden_button"
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
