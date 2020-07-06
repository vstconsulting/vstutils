<template>
    <div class="json-field-readonly">
        <component
            :is="jsonMapper.getComponent(value)"
            :value="value"
            :levels="[0]"
            :title="undefined"
        ></component>
    </div>
</template>

<script>
    export default {
        inject: ['jsonMapper'],
    };
</script>

<style scoped></style>
