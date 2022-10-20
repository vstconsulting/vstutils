<template>
    <Card :title="title" collapsable>
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
    import Card from '../../../components/Card.vue';
    import JsonMixin from './JsonMixin.js';

    export default {
        name: 'JsonArray',
        components: { Card },
        mixins: [JsonMixin],
        inject: ['jsonMapper'],
    };
</script>
