<template>
    <div class="json-string">
        <b>{{ title }}</b>
        : {{ value }}
    </div>
</template>
<script>
    import JsonMixin from './JsonMixin.js';

    export default {
        name: 'JsonString',
        mixins: [JsonMixin],
    };
</script>
<style scoped>
    .json-string {
        font-size: 1rem;
    }
</style>
