<template>
    <div class="row">
        <div class="col-lg-12">
            <div style="position: relative; margin: auto; height: 300px; width: 100%; overflow: hidden;">
                <canvas id="chart_js_canvas"></canvas>
            </div>
        </div>
    </div>
</template>

<script>
    import { BaseWidgetMixin } from './baseWidgetMixins.js';

    /**
     * Base mixin for 'content_body' component - child component of line_chart component.
     */
    export default {
        name: 'w_line_chart_content_body_mixin',
        mixins: [BaseWidgetMixin],
        data() {
            return {
                /**
                 * Property, that stores ChartJS instance.
                 */
                chart_instance: undefined,
            };
        },
        watch: {
            value: function (value) {
                this.updateChartData();
            },
            'item.lines': {
                handler(value) {
                    this.updateChartData();
                },
                deep: true,
            },
        },
        mounted() {
            this.generateChart();
        },
        methods: {
            /**
             * Method, that generates new instance of chart
             * and save it in this.chart_instance;
             */
            generateChart() {
                let el = $(this.$el).find('#chart_js_canvas');
                let chart_data = this.item.formChartData(this.value);
                this.chart_instance = this.item.generateChart(el, chart_data);
            },
            /**
             * Method, that updates chart's data (datasets, labels, options, ect).
             */
            updateChartData() {
                let new_chart_data = this.item.formChartData(this.value);
                let areLabelsTheSame = deepEqual(this.chart_instance.data.labels, new_chart_data.data.labels);

                if (areLabelsTheSame) {
                    // if labels are the same - period of chart was not changed
                    // and we should update only datasets, that were changed
                    // (only changed lines should be smoothly updated on the page)
                    return this._updateChartDataPartly(new_chart_data);
                }

                // if labels are not the same - period of chart was changed
                // and we should update labels and datasets for all lines
                // (all chart will be rerendered)
                return this._updateChartDataFully(new_chart_data);
            },
            /**
             * Method, that updates chart's data fully, without defining, what was actually changed.
             * @param {object} new_chart_data Object with updated chart's data.
             * @private
             */
            _updateChartDataFully(new_chart_data) {
                this.chart_instance.data = new_chart_data.data;
                this.chart_instance.options = new_chart_data.options;
                this.chart_instance.update({
                    duration: 700,
                    easing: 'linear',
                });
            },
            /**
             * Method, that updates chart's data partly: defines, what was actually changed and updates those parts of data.
             * @param {object} new_chart_data Object with updated chart's data.
             * @private
             */
            _updateChartDataPartly(new_chart_data) {
                for (let index in new_chart_data.data.datasets) {
                    if (!new_chart_data.data.datasets.hasOwnProperty(index)) {
                        continue;
                    }

                    for (let key in new_chart_data.data.datasets[index]) {
                        if (!new_chart_data.data.datasets[index].hasOwnProperty(key)) {
                            continue;
                        }

                        if (
                            !deepEqual(
                                new_chart_data.data.datasets[index][key],
                                this.chart_instance.data.datasets[index][key],
                            )
                        ) {
                            this.chart_instance.data.datasets[index][key] =
                                new_chart_data.data.datasets[index][key];
                        }
                    }
                }

                this.chart_instance.options = new_chart_data.options;
                this.chart_instance.update();
            },
        },
    };
</script>

<style scoped></style>
