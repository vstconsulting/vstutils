<template>
    <Card :title="title">
        <component
            :is="jsonMapper.getComponent(subValue, name)"
            v-for="(subValue, name, idx) in value"
            :key="idx"
            :value="subValue"
            :title="name"
            :levels="[...levels, idx]"
        />
    </Card>
</template>
<script>
    import JsonMixin from './JsonMixin.js';
    import Card from './Card.vue';

    export default {
        name: 'JsonObject',
        components: { Card },
        mixins: [JsonMixin],
        inject: ['jsonMapper'],
    };
</script>
