<template functional>
    <div class="select-icon fa" :class="props.isSelected ? 'fa-toggle-on' : 'fa-toggle-off'" />
</template>
<script>
    export default {
        name: 'SelectToggleButton',
    };
</script>
<style scoped>
    .select-icon {
        font-size: 24px;
        cursor: pointer;
    }
    .fa-toggle-on {
        color: #128200;
    }
    .fa-toggle-off {
        color: #c6c6c6;
    }
</style>
