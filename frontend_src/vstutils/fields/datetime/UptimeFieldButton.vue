<template>
    <div
        data-toggle="tooltip"
        :class="wrapperClasses"
        :style="wrapperStyles"
        :title="helpText"
        @mousedown="$emit('action')"
        @mouseup="$emit('reset-increment')"
        @mouseleave="$emit('reset-increment')"
    >
        <span :class="spanClasses" :style="spanStyles">
            <span :class="iconClasses" :style="iconStyles" />
        </span>
    </div>
</template>

<script>
    import { BaseFieldButton } from '../buttons';

    export default {
        mixins: [BaseFieldButton],
    };
</script>

<style scoped>
    div {
        cursor: pointer;
    }
</style>
