import Chart from "chart.js";

/**
 * Class of base widget.
 */
export class BaseWidget {
  constructor(options = {}) {
    /**
     * Widget format - this property is used during choosing
     * of appropriate Vue component for current widget rendering.
     */
    this.format = "base";
    /**
     * Order number of current widget.
     */
    this.sort = 0;
    /**
     * Property, that means, that current widget should be shown on the page.
     */
    this.active = true;
    /**
     * Property, that means, that current widget should be collapsed on the page.
     */
    this.collapse = false;
    /**
     * Property, that means, that current widget could be collapsed on the page.
     */
    this.collapsable = true;
    /**
     * Name of widget.
     */
    this.name = options.name;
    /**
     * Widget's title, that will be shown on the page.
     */
    this.title = options.title;

    ["active", "collapse", "sort"].forEach(key => {
      if (options[key] !== undefined) {
        this[key] = options[key];
      }
    });
  }
}

/**
 * Class of counter widget.
 */
export class CounterWidget extends BaseWidget {
  constructor(options = {}) {
    super(options);

    this.format = "counter";
    this.collapsable = false;
    /**
     * URL of page with which current widget is linked.
     */
    this.url = options.url;
  }
}

/**
 * Class of card widget.
 */
export class CardWidget extends BaseWidget {}

/**
 * Class of line chart widget.
 */
export class LineChartWidget extends BaseWidget {
  constructor(options) {
    super(options);
    this.format = "line_chart";
    /**
     * Property means type of ChartJS instance, that should be generated.
     */
    this.chart_type = "line";
    /**
     * Property, that stores options of ChartJS instance.
     */
    this.chart_options = options.chart_options || {};
    /**
     * Property, that stores objects with settings for lines of line ChartJS.
     */
    this.lines = options.lines || [];
  }
  /**
   * Method, that forms labels for current chart.
   * Labels - titles of items on xAxes line.
   * @param {object} raw_data Object with raw data for chart.
   * @return {Array}
   * @private
   */
  _formChartDataLabels(raw_data) {
    /* jshint unused: false */
    return [];
  }

  /**
   * Method, that form data sets for chart lines.
   * @param {object} raw_data Object with raw data for chart.
   * @param {array} labels Array with chart labels.
   * @return {Array}
   * @private
   */
  _formChartDataDatasets(raw_data, labels) {
    let datasets = [];

    for (let index = 0; index < this.lines.length; index++) {
      let line = this.lines[index];

      if (!line.active) {
        continue;
      }

      datasets.push({
        label: line.title || line.name,
        data: this._formChartDataDatasets_oneLine(line, raw_data, labels),
        borderColor: line.color,
        backgroundColor: line.bg_color
      });
    }

    return datasets;
  }
  /**
   * Method, that form data sets for chart lines.
   * @param {object} line Object with settings of ChartJS line.
   * @param {object} raw_data Object with raw data for chart.
   * @param {array} labels Array with chart labels.
   * @return {Array}
   * @private
   */
  _formChartDataDatasets_oneLine(line, raw_data, labels) {
    /* jshint unused: false */
    return [];
  }
  /**
   * Method, that forms ChartJS data based on raw_data.
   * @param {object} raw_data Object with raw data for chart.
   */
  formChartData(raw_data) {
    let labels = this._formChartDataLabels(raw_data);
    let datasets = this._formChartDataDatasets(raw_data, labels);

    return this.getChartData(datasets, labels);
  }
  /**
   * Method, that form data sets for chart lines.
   * @param {array} datasets Array with lines data sets.
   * @param {array} labels Array with chart labels.
   */
  getChartData(datasets, labels) {
    return {
      type: this.chart_type,
      data: {
        datasets: datasets,
        labels: labels
      },
      options: this.chart_options
    };
  }
  /**
   * Method, that return new instance of ChartJS.
   * @param {object} el DOM Element to which ChartJS instance will be mounted.
   * @param {object} chart_data Object with data for ChartJS instance.
   */
  generateChart(el, chart_data) {
    return new Chart(el, chart_data);
  }
}
