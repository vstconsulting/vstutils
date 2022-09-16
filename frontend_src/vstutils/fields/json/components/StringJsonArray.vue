<template>
    <div class="string-json-array">
        <label>{{ title }}</label>
        <p v-for="(val, idx) in strings" :key="idx" v-text="val" />
    </div>
</template>
<script>
    import JsonMixin from './JsonMixin.js';

    export default {
        name: 'StringJsonArray',
        mixins: [JsonMixin],
        computed: {
            strings() {
                return this.value.map((val) => {
                    if (!val) {
                        return '';
                    }
                    if (typeof val === 'symbol') {
                        return val.description;
                    }
                    return val;
                });
            },
        },
    };
</script>
<style scoped>
    p {
        margin-bottom: 0.5rem;
    }
</style>
