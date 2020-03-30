import CardWidgetMixin from './CardWidgetMixin.vue';
import LineChartContentBodyMixin from './LineChartContentBodyMixin.vue';

/**
 * Base mixin for line_chart components.
 */
const LineChartMixin = {
    name: 'w_line_chart_mixin',
    mixins: [CardWidgetMixin],
    components: {
        /**
         * Component, that is responsible for rendering of widgets body content.
         */
        content_body: {
            mixins: [LineChartContentBodyMixin],
        },
    },
};

export default LineChartMixin;
