<template>
    <div
        :class="wrapper_classes"
        :style="wrapper_styles"
        @mousedown="eventHandler"
        @mouseup="$emit('resetIncrement')"
        @mouseleave="$emit('resetIncrement')"
        data-toggle="tooltip"
        :title="help_text"
    >
        <span :class="span_classes" :style="span_styles">
            <span :class="icon_classes" :style="icon_styles"></span>
        </span>
    </div>
</template>

<script>
    export default {};
</script>

<style scoped></style>
