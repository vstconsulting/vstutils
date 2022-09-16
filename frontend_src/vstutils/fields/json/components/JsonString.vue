<template>
    <div class="json-string">
        <b>{{ title }}</b>
        : {{ valueAsStr }}
    </div>
</template>
<script>
    import JsonMixin from './JsonMixin.js';

    export default {
        name: 'JsonString',
        mixins: [JsonMixin],
        computed: {
            valueAsStr() {
                if (typeof this.value === 'symbol') {
                    return this.value.description;
                }
                return this.value;
            },
        },
    };
</script>
<style scoped>
    .json-string {
        font-size: 1rem;
    }
</style>
