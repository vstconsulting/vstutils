import { BaseWidget, CounterWidget, CardWidget, LineChartWidget } from './widgets.js';

/**
 * Object, that contains Widgets classes.
 */
let guiWidgets = {
    base: BaseWidget,
    counter: CounterWidget,
    card: CardWidget,
    line_chart: LineChartWidget,
};
window.guiWidgets = guiWidgets;

let guiDashboard = {
    /* jshint unused: false */
    widgets: {},
};
window.guiDashboard = guiDashboard;

export { BaseWidget, CounterWidget, CardWidget, LineChartWidget };
