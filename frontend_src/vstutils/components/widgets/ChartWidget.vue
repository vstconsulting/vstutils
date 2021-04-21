<template>
    <Card v-bind="$props">
        <canvas ref="canvas" />
    </Card>
</template>

<script>
    import Card from '../Card.vue';

    export default {
        name: 'ChartWidget',
        components: { Card },
        mixins: [Card],
        props: {
            type: { type: String, default: 'line' },
            data: { type: Object, required: true },
            options: { type: Object, default: () => ({}) },
        },
        data: () => ({
            chart: null,
        }),
        created() {
            if (!window.Chart) {
                throw new Error('Chart.js not found');
            }
        },
        mounted() {
            this.chart = new window.Chart(this.$refs.canvas.getContext('2d'), {
                type: this.type,
                options: this.options,
                data: this.data,
            });
        },
        beforeDestroy() {
            this.chart.destroy();
        },
    };
</script>
