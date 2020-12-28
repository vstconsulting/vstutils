<template>
    <div
        class="field-button"
        :class="wrapperClasses"
        :style="wrapperStyles"
        :title="helpText"
        data-toggle="tooltip"
    >
        <span :class="spanClasses" :style="spanStyles">
            <i :class="iconClasses" :style="iconStyles" />
        </span>
    </div>
</template>

<script>
    export default {};
</script>

<style scoped>
    .field-button {
        cursor: pointer;
    }
</style>
