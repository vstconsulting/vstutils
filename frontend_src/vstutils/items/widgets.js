import Vue from "vue";
import { w_line_chart_mixin } from "./mixins.js";

/**
 * Component for guiWidgets.counter.
 */
export const w_counter = Vue.component("w_counter", {
  template: "#template_w_counter",
  props: {
    item: Object,
    value: {
      default: 0
    }
  }
});
/**
 * Component for guiWidgets.line_chart.
 */
export const w_line_chart = Vue.component("w_line_chart", {
  mixins: [w_line_chart_mixin]
});
