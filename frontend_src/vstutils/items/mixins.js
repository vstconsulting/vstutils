/**
 * Mixin for buttons, that are not link_buttons.
 */
export const base_button_mixin = {
  props: ["type", "options", "look"],
  template: "#template_button_common",
  computed: {
    title() {
      // return this.options.title || this.options.name;
      return this.$t(this.options.title || this.options.name);
    },
    classes() {
      return this.getRepresentationProperty("classes");
    },
    class_with_name() {
      return "btn-" + this.type + "-" + this.options.name;
    },
    icon_classes() {
      return this.getRepresentationProperty("icon_classes");
    },
    title_classes() {
      return this.getRepresentationProperty("title_classes");
    }
  },
  methods: {
    getPkKeys(path) {
      let pk_keys = path.match(/{[A-z0-9]+}/g);
      if (pk_keys) {
        return pk_keys.map(pk_key => pk_key.replace(/^{|}$/g, ""));
      }
      return [];
    },

    getPathParams(path) {
      let pk_key = this.getPkKeys(path).last;
      if (pk_key && this.instance_id) {
        let params = {};
        params[pk_key] = this.instance_id;
        return $.extend(true, {}, this.$route.params, params);
      }
      return this.$route.params;
    },

    onClickHandler(instance_id) {
      if (this.options.method) {
        return this.doMethod(this.options, instance_id);
      }

      if (this.options.empty) {
        return this.doEmptyAction(this.options, instance_id);
      }

      if (this.options.path) {
        return this.goToPath(this.options.path);
      }

      return this.doAction(instance_id);
    },

    doMethod(options, instance_id) {
      this.$root.$emit(
        "eventHandler-" + this.$root.$children.last._uid,
        this.options.method,
        $.extend(true, { instance_id: instance_id }, options)
      );
    },

    goToPath(path_name) {
      this.$router.push({
        name: path_name,
        params: this.getPathParams(path_name)
      });
    },

    doAction(instance_id) {
      if (this.options.multi_action) {
        this.$root.$emit(
          "eventHandler-" + this.$root.$children.last._uid,
          this.options.name + "Instances"
        );
      } else {
        this.$root.$emit(
          "eventHandler-" + this.$root.$children.last._uid,
          this.options.name + "Instance",
          { instance_id: instance_id }
        );
      }
    },

    doEmptyAction(options, instance_id) {
      let opt = options;
      if (typeof instance_id == "number" || typeof instance_id == "string") {
        opt = $.extend(true, { instance_id: instance_id }, options);
      }
      this.$root.$emit(
        "eventHandler-" + this.$root.$children.last._uid,
        "executeEmptyActionOnInstance",
        opt
      );
    },

    getRepresentationProperty(name) {
      let property = [];

      if (this.look && this.look[name]) {
        property = this.look[name];
      }

      if (this.options && this.options[name]) {
        property = this.options[name];
      }

      return property;
    }
  }
};

/**
 * Mixin for gui_list_table and gui_list_table_row.
 */
export const base_list_table_mixin = {
  mixins: [hide_field_in_table_mixin] /* globals hide_field_in_table_mixin */,
  computed: {
    child_actions_exist: function() {
      return this.doesPropertyExist(this.schema, "child_links");
    },
    multi_actions_exist: function() {
      return this.doesPropertyExist(this.schema, "multi_actions");
    }
  },
  methods: {
    doesPropertyExist(obj, property) {
      if (!obj[property]) {
        return false;
      }

      if (Array.isArray(obj[property])) {
        return obj[property].length > 0;
      }

      if (typeof obj[property] == "object") {
        return Object.keys(obj[property]).length > 0;
      }
    },
    td_classes(el, name) {
      return addCssClassesToElement(
        el,
        name,
        this.schema.operation_id.replace("_list", "")
      );
    }
  }
};

/**
 * Mixin for gui_entity_{page, page_new, pade_edit, action} components.
 */
export const base_page_type_mixin = {
  props: ["data", "view", "opt"],
  template: "#template_entity_page",
  data() {
    return {
      options: {
        store: "objects"
      }
    };
  },
  computed: {
    instance() {
      return this.data.instance;
    }
  }
};

/**
 * Mixin for gui_entity_{page_new, action} components.
 */
export const page_new_and_action_type_mixin = {
  data() {
    return {
      options: {
        hideReadOnly: true,
        store: "sandbox"
      }
    };
  }
};

/**
 * Mixin for gui_entity_action components.
 */
export const action_type_mixin = {
  data() {
    let hideUnrequired = false;

    if (
      this.view.objects &&
      this.view.objects.model &&
      this.view.objects.model.fields &&
      Object.keys(this.view.objects.model.fields).length > 6
    ) {
      hideUnrequired = true;
    }

    return {
      options: {
        hideUnrequired: hideUnrequired
      }
    };
  }
};

/**
 * Mixin for modal window table, table row mixin.
 */
export const base_instances_table_and_table_row_mixin = {
  computed: {
    /**
     * Boolean property, that means is there actions row in the table.
     */
    with_actions() {
      let p = "enable_actions";

      return this.opt[p] !== undefined ? this.opt[p] : this[p];
    },
    /**
     * Property, that returns url for instances list.
     */
    list_url() {
      return this.opt.url ? this.opt.url : this.$route.path;
    },
    /**
     * Property, that returns schema of current instances list view.
     */
    schema() {
      return this.opt.schema || {};
    },
    /**
     * Property, that returns fields of current instances list.
     */
    fields() {
      return this.opt.fields;
    }
  }
};

/**
 * Mixin for modal window table.
 */
export const base_instances_table_mixin = {
  mixins: [base_list_table_mixin, base_instances_table_and_table_row_mixin],
  props: {
    instances: {
      type: Array
    },
    opt: {
      default: () => {}
    }
  },

  template: "#template_base_instances_list_table",
  data() {
    return {
      enable_multiple_select: false,
      enable_actions: false
    };
  },
  computed: {
    /**
     * Boolean property, that means is there multiple select in the table.
     */
    with_multiple_select() {
      let p = "enable_multiple_select";

      return this.opt[p] !== undefined ? this.opt[p] : this[p];
    },
    /**
     * Property that returns CSS class for current table.
     */
    table_classes() {
      return this.with_multiple_select ? "multiple-select" : "";
    },
    /**
     * Property that returns CSS class for current table's head row.
     */
    header_tr_classes() {
      return this.allSelected ? "selected" : "";
    },
    /**
     * Property that returns true, if all instances in the table selected.
     * Otherwise, it returns false.
     */
    allSelected() {
      let selections = this.getSelections();

      for (let index = 0; index < this.instances.length; index++) {
        let instance = this.instances[index];

        if (!selections[instance.getPkValue()]) {
          return false;
        }
      }

      return true;
    }
  },
  methods: {
    /**
     * Method, that changes selects/unselects all instances in the table.
     */
    changeAllRowsSelection() {
      let ids = {};
      for (let index = 0; index < this.instances.length; index++) {
        let instance = this.instances[index];
        ids[instance.getPkValue()] = !this.allSelected;
      }
      this.setSelections(ids);
    },
    /**
     * Method, that returns 'selections' object.
     */
    getSelections() {
      return this.opt.selections;
    },
    /**
     * Method, that calls parents 'setSelections' method.
     * @param {array} ids Array with ids of instances,
     * selection of which should be changed.
     */
    setSelections(ids) {
      this.$emit("setSelections", Object.assign(this.opt.selections, ids));
    },
    /**
     * Method, that calls parents 'toggleSelection' method.
     * @param {object} opt.
     */
    toggleSelection(opt) {
      this.$emit("toggleSelection", opt);
    },
    /**
     * Method, that forms object with properties for table row.
     * @param {object} instance Instance for table row.
     */
    row_opt(instance) {
      return {
        view: this.opt.view,
        schema: this.schema,
        fields: this.fields,
        url: this.list_url,
        selected: this.opt.selections[instance.getPkValue()]
      };
    }
  }
};

/**
 * Mixin for modal window table row.
 */
export const base_instances_table_row_mixin = {
  mixins: [
    base_list_table_mixin,
    table_row_mixin,
    base_instances_table_and_table_row_mixin
  ],
  props: {
    instance: {
      type: Object
    },
    opt: {
      default: () => {
        return {};
      }
    }
  },
  template: "#template_base_instances_list_table_row",
  data() {
    return {
      blank_url: true,
      enable_select: true,
      enable_actions: false
    };
  },
  computed: {
    with_select() {
      let p = "enable_select";

      return this.opt[p] !== undefined ? this.opt[p] : this[p];
    },

    selected: function() {
      return this.opt.selected;
    },

    tr_classes: function() {
      let classes = this.selected ? "selected" : "";

      for (let key in this.fields) {
        if (this.fields.hasOwnProperty(key)) {
          let field = this.fields[key];

          if (
            field.options.format == "choices" ||
            field.options.type == "choices"
          ) {
            classes +=
              " " +
              addCssClassesToElement(
                "tr",
                this.instance.data[field.options.name],
                field.options.name
              );
          }
        }
      }

      return classes;
    },

    base_url() {
      return this.list_url.replace(/\/$/g, "");
    },
    data_to_represent: function() {
      return this.instance.data;
    },
    _blank() {
      let p = "blank_url";
      return this.opt[p] !== undefined ? this.opt[p] : this[p];
    },

    child_links_buttons() {
      return this.opt.view.getViewSublinkButtons(
        "child_links",
        this.schema.child_links,
        this.instance
      );
    }
  },
  methods: {
    toggleSelection() {
      this.$emit("toggleSelection", { id: this.instance.getPkValue() });
    }
  }
};

/**
 * Mixin for sidebar_link and sidebar_link_wrapper components.
 */
export const sidebar_link_mixin = {
  computed: {
    /**
     * Property, that returns url of current page.
     */
    page_url() {
      if (this.$route && this.$route.path) {
        return this.$route.path;
      } else {
        return window.location.hash;
      }
    }
  },
  methods: {
    is_link_active(item, url) {
      if (item.url == url) {
        return true;
      }

      if (url == "/") {
        return false;
      }

      let instance = url.split("/")[1];

      if (!instance) {
        return false;
      }

      if (item.url && item.url.indexOf(instance) == 1) {
        return true;
      }
    }
  }
};

export const base_widget_mixin = {
  props: {
    /**
     * Property, that stores widget object - object with widget settings.
     */
    item: Object,
    /**
     * Property, that stores widget's value.
     */
    value: {
      default: () => {}
    }
  }
};

/**
 * Base mixin for 'body' child component of 'card widget' components.
 */
export const card_widget_body_mixin = {
  mixins: [base_widget_mixin]
};

/**
 * Base mixin for 'card widget' components.
 */
export const card_widget_mixin = {
  mixins: [base_widget_mixin],
  template: "#template_card_widget",
  data() {
    return {
      /**
       * Property, that means use child content_header component or not.
       */
      with_content_header: false
    };
  },
  computed: {
    /**
     * CSS classes of widget DOM element's wrapper.
     */
    wrapper_classes() {
      return ["col-lg-12", "col-12", "dnd-block"];
    }
  },
  methods: {
    /**
     * Method, that toggles item.collapse value to opposite.
     */
    toggleCollapse() {
      this.item.collapse = !this.item.collapse;
    },
    /**
     * Method, that toggles item.active value to opposite.
     */
    toggleActive() {
      this.item.active = !this.item.active;
    }
  },
  components: {
    /**
     * Component, that is responsible for rendering of widgets body content.
     */
    content_body: {
      mixins: [card_widget_body_mixin]
    }
  }
};

/**
 * Base mixin for 'content_body' component - child component of line_chart component.
 */
export const w_line_chart_content_body_mixin = {
  mixins: [base_widget_mixin],
  template: "#template_w_line_chart_content_body",
  data() {
    return {
      /**
       * Property, that stores ChartJS instance.
       */
      chart_instance: undefined
    };
  },
  watch: {
    value: function(value) {
      /* jshint unused: false */
      this.updateChartData();
    },
    "item.lines": {
      handler(value) {
        /* jshint unused: false */
        this.updateChartData();
      },
      deep: true
    }
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
      let el = $(this.$el).find("#chart_js_canvas");
      let chart_data = this.item.formChartData(this.value);
      this.chart_instance = this.item.generateChart(el, chart_data);
    },
    /**
     * Method, that updates chart's data (datasets, labels, options, ect).
     */
    updateChartData() {
      let new_chart_data = this.item.formChartData(this.value);
      let areLabelsTheSame = deepEqual(
        this.chart_instance.data.labels,
        new_chart_data.data.labels
      );

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
        easing: "linear"
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
              this.chart_instance.data.datasets[index][key]
            )
          ) {
            this.chart_instance.data.datasets[index][key] =
              new_chart_data.data.datasets[index][key];
          }
        }
      }

      this.chart_instance.options = new_chart_data.options;
      this.chart_instance.update();
    }
  }
};

/**
 * Base mixin for line_chart components.
 */
export const w_line_chart_mixin = {
  mixins: [card_widget_mixin],
  components: {
    /**
     * Component, that is responsible for rendering of widgets body content.
     */
    content_body: {
      mixins: [w_line_chart_content_body_mixin]
    }
  }
};
