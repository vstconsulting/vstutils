<template>
    <div v-if="isEmpty" />
    <Card v-else :title="title">
        <component
            :is="jsonMapper.getComponent(subValue, name)"
            v-for="(subValue, name, idx) in valueAsObj"
            :key="idx"
            :value="subValue"
            :title="name"
            :levels="[...levels, idx]"
        />
    </Card>
</template>
<script>
    import Card from '../../../components/Card.vue';
    import JsonMixin from './JsonMixin.js';

    export default {
        name: 'JsonObject',
        components: { Card },
        mixins: [JsonMixin],
        inject: ['jsonMapper'],
        computed: {
            isEmpty() {
                return !this.valueAsObj || Object.keys(this.valueAsObj).length === 0;
            },
            valueAsObj() {
                if (this.value instanceof Map) {
                    return Object.fromEntries(this.value.entries());
                }

                return this.value;
            },
        },
    };
</script>
