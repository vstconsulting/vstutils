import {
  BaseWidget,
  CounterWidget,
  CardWidget,
  LineChartWidget
} from "./widgets.js";

/**
 * Object, that contains Widgets classes.
 */
export let guiWidgets = {
  base: BaseWidget,
  counter: CounterWidget,
  card: CardWidget,
  line_chart: LineChartWidget
};
window.guiWidgets = guiWidgets;

export let guiDashboard = {
  /* jshint unused: false */
  widgets: {}
};
window.guiDashboard = guiDashboard;
