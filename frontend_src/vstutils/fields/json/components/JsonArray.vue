<template>
    <Card :title="title">
        <component
            :is="jsonMapper.getComponent(subValue)"
            v-for="(subValue, idx) in value"
            :key="idx"
            :value="subValue"
            :title="`${title}[${idx}]`"
            :levels="[...levels, idx]"
        />
    </Card>
</template>
<script>
    import JsonMixin from './JsonMixin.js';
    import Card from './Card.vue';

    export default {
        name: 'JsonArray',
        components: { Card },
        mixins: [JsonMixin],
        inject: ['jsonMapper'],
    };
</script>
