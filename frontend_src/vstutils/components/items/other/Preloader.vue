<template>
    <div class="in-loading" v-if="show">
        <div class="loader-wrapper">
            <div class="loader"></div>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'preloader',
        props: ['show'],
    };
</script>

<style scoped></style>
