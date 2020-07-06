<template>
    <div class="string-json-array">
        <label>{{ title }}</label>
        <p v-for="(val, idx) in value" :key="idx" v-text="val" />
    </div>
</template>
<script>
    import JsonMixin from './JsonMixin.js';

    export default {
        name: 'StringJsonArray',
        mixins: [JsonMixin],
    };
</script>
<style scoped>
    p {
        margin-bottom: 0.5rem;
    }
</style>
