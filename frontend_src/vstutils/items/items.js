import Vue from "vue";
import { guiCustomizer } from "../guiCustomizer";
import {
  sidebar_link_mixin,
  base_button_mixin,
  base_list_table_mixin,
  base_instances_table_mixin,
  base_instances_table_row_mixin,
  base_page_type_mixin,
  page_new_and_action_type_mixin,
  action_type_mixin
} from "./mixins.js";

////////////////////////////////////////////////////////////////////////////////////
// Block of common components for all view types
////////////////////////////////////////////////////////////////////////////////////
/**
 * Preloader component.
 */
export const preloader = Vue.component("preloader", {
  props: ["show"],
  template: "#template_preloader"
});
/**
 * Component of top navigation menu.
 */
export const top_nav = Vue.component("top_nav", {
  template: "#template_top_nav",
  props: {
    /**
     * Property, that means what type of links to use:
     *  - true - <a></a>,
     *  - false - <router-link></router-link>.
     */
    a_links: {
      default: false
    }
  },
  data() {
    return {
      gravatar: new Gravatar() /* globals Gravatar */
    };
  },
  computed: {
    /**
     * Boolean property, that returns true if user is authorized.
     */
    is_authenticated() {
      return Boolean(app.api.getUserId());
    },
    /**
     * Boolean property, that returns true if gravatar_mode is activated.
     */
    enable_gravatar() {
      return app.api.openapi.info["x-settings"].enable_gravatar;
    },
    /**
     * Property, that returns object with properties of current application user.
     */
    user() {
      return app.user;
    },
    /**
     * Property, that returns URL to user's gravatar.
     */
    gravatar_img() {
      return this.gravatar.getGravatarByEmail(this.user.email);
    },
    /**
     * Property, that returns URL to profile page.
     */
    profile_url() {
      let url = "/profile";
      if (this.a_links) {
        return app.api.getHostUrl() + "/#" + url;
      }

      return url;
    },
    /**
     * Property, that returns URL to profile/settings page.
     */
    profile_settings_url() {
      let url = "/profile/settings";
      if (this.a_links) {
        return app.api.getHostUrl() + "/#" + url;
      }

      return url;
    },
    /**
     * Property, that returns name of attribute for storing link url.
     */
    link_attr() {
      if (this.a_links) {
        return "href";
      }

      return "to";
    },
    /**
     * Property, that returns name html tag for link.
     */
    link_component() {
      if (this.a_links) {
        return "a";
      }

      return "router-link";
    },
    /**
     * Property, that returns URL to openapi.
     */
    openapi_url() {
      return window.openapi_path;
    },
    /**
     * Property, that returns logout URL.
     */
    logout_url() {
      return app.api.getHostUrl() + "/logout";
    },
    /**
     * Property, that returns login URL.
     */
    login_url() {
      return "/login/";
    }
  },
  methods: {
    /**
     * Method, that returns URL to default gravatar img.
     */
    getDefaultGravatarImg() {
      return this.gravatar.getDefaultGravatar();
    },
    /**
     * Method, that sets default garavatar img to some <img>.
     * @param {object} el DOM img element.
     */
    setDefaultGravatar(el) {
      el.src = this.getDefaultGravatarImg();
      return false;
    }
  }
});
/**
 * Logo component.
 */
export const logo = Vue.component("logo", {
  props: ["title"],
  template: "#template_logo"
});
/**
 * Sidebar component.
 */
export const sidebar = Vue.component("sidebar", {
  props: {
    menu: Array,
    docs: Object,
    /**
     * Property, that means what type of links to use:
     *  - true - <a></a>,
     *  - false - <router-link></router-link>.
     */
    a_links: {
      default: false
    }
  },
  template: "#template_sidebar",
  computed: {
    /**
     * Property, that returns menu items, that should be rendered.
     */
    menu_items() {
      let url_prefix = "";
      if (this.a_links) {
        url_prefix = app.api.getHostUrl();
      }

      let items = [
        {
          name: "Home",
          url: url_prefix + "/",
          span_class: "fas fa-tachometer-alt",
          origin_link: this.a_links
        }
      ];

      items = items.concat(this.menu || []);

      if (this.docs && this.docs.has_docs && this.docs.docs_url) {
        items.push({
          name: "Documentation",
          url: this.docs.docs_url,
          span_class: "fa fa-book",
          origin_link: true
        });
      }

      return items;
    }
  },
  methods: {
    /**
     * Method, that hides sidebar.
     */
    hideSidebar() {
      if (window.innerWidth <= 991) {
        $("body").removeClass("sidebar-open");
        $("body").addClass("sidebar-collapse");
      }
    }
  }
});
/**
 * Sidebar_link_wrapper component.
 */
export const sidebar_link_wrapper = Vue.component("sidebar_link_wrapper", {
  mixins: [sidebar_link_mixin],
  props: ["item"],
  template: "#template_sidebar_link2",
  data() {
    return {
      /**
       * Property, that is responsible for showing/hiding of submenu.
       */
      menu_open: false
    };
  },
  watch: {
    page_url: function(path) {
      /* jshint unused: false */
      if (!this.are_sublinks_active && this.menu_open) {
        this.menu_open = false;
      }
    },
    are_sublinks_active: function(val) {
      this.menu_open = val;
    },
    is_item_active: function(val) {
      if (!this.are_sublinks_active) {
        this.menu_open = val;
      }
    }
  },
  created() {
    this.menu_open = this.are_sublinks_active || this.is_item_active;
  },
  computed: {
    /**
     * Property, that returns classes for sidebar_link wrapper.
     */
    wrapper_classes() {
      let classes = "";

      if (this.item.sublinks) {
        classes += "menu-treeview has-treeview ";
      }

      if (this.menu_open) {
        classes += "menu-open ";
      }

      return classes;
    },
    /**
     * Boolean property, that means: is there any active sublink.
     */
    are_sublinks_active() {
      if (!this.item.sublinks) {
        return false;
      }

      for (let index = 0; index < this.item.sublinks.length; index++) {
        let sublink = this.item.sublinks[index];

        if (this.is_link_active(sublink, this.page_url)) {
          return true;
        }
      }

      return false;
    },
    /**
     * Boolean property, that means active current sidebar_link or not.
     */
    is_item_active() {
      return this.is_link_active(this.item, this.page_url);
    }
  },
  methods: {
    /**
     * Method, that shows/hides submenu.
     */
    toggleMenuOpen() {
      this.menu_open = !this.menu_open;
    },
    /**
     * Method, that calls parent's 'hideSidebar' method.
     */
    hideSidebar() {
      this.$emit("hideSidebar");
    }
  }
});
/**
 * Sidebar_link component.
 */
export const sidebar_link = Vue.component("sidebar_link", {
  mixins: [sidebar_link_mixin],
  props: ["item"],
  template: "#template_sidebar_link",
  computed: {
    /**
     * Property, that returns icon classes for current sidebar_link.
     */
    icon_classes() {
      return this.item.span_class;
    },
    /**
     * Property, that returns classes for current sidebar_link.
     */
    link_classes() {
      if (this.is_link_active(this.item, this.page_url)) {
        return "active";
      }

      return "";
    },
    /**
     * Property, that returns type of current sidebar_link: <router-link></router-link> or <a></a>.
     */
    link_type() {
      if (this.item.origin_link || !this.item.url) {
        return "a";
      }

      return "router-link";
    },
    /**
     * Property, that returns sidebar_link url to represent.
     */
    link_url() {
      return this.item.url || "";
    },
    /**
     * Property, that returns name of attribute for storing sidebar_link url.
     */
    link_url_attr() {
      if (this.link_type == "a" && this.item.url) {
        return "href";
      }

      return "to";
    }
  },
  methods: {
    /**
     * Method - handler for sidebar_link click event.
     */
    onLinkClickHandler() {
      if (this.item.url) {
        return this.$emit("hideSidebar");
      } else {
        if (this.item.sublinks) {
          return this.onToggleIconClickHandler();
        }
      }
    },
    /**
     * Method - handler for sidebar_link toggle icon click event.
     */
    onToggleIconClickHandler() {
      return this.$emit("toggleMenuOpen");
    }
  }
});
/**
 * Component for main footer.
 */
export const main_footer = Vue.component("main_footer", {
  template: "#template_main_footer",
  computed: {
    /**
     * Property, that returns project version.
     */
    project_version() {
      return app.api.openapi.info["x-versions"].application;
    },
    /**
     * Boolean property, that means: debug mode is enable or not.
     */
    is_debug() {
      return window.isDebug;
    }
  }
});
/**
 * Component for breadcrumbs.
 */
export const breadcrumbs = Vue.component("breadcrumbs", {
  props: ["breadcrumbs"],
  template: "#template_breadcrumbs"
});
/**
 * Component for buttons wrapper - container, that includes all buttons for current view.
 */
export const gui_buttons_row = Vue.component("gui_buttons_row", {
  props: ["view", "data", "opt"],
  template: "#template_buttons_row",
  computed: {
    schema() {
      return this.view.schema;
    },

    operations() {
      return this.getButtons("operations");
    },

    actions() {
      return this.getButtons("actions");
    },

    sublinks() {
      return this.getButtons("sublinks");
    },

    filters_opt() {
      return $.extend(true, {}, this.opt, { store: "filters" });
    }
  },
  methods: {
    getButtons(buttons_name) {
      return this.view.getViewSublinkButtons(
        buttons_name,
        this.schema[buttons_name],
        this.data.instance
      );
    }
  }
});
/**
 * Component for several buttons (dict of buttons).
 * According to screen size, component shows drop-down list with buttons (small screens)
 * or shows several independent buttons (big screens).
 */
export const gui_group_of_buttons = Vue.component("gui_group_of_buttons", {
  props: ["title", "type", "buttons", "classes"],
  template: "#template_group_of_buttons",
  data: function() {
    return {
      window_width: window.innerWidth
    };
  },
  mounted() {
    window.addEventListener("resize", () => {
      this.window_width = window.innerWidth;
    });
  },
  computed: {
    groupButtonsOrNot() {
      let buttons_amount = 0;
      if (typeof this.buttons == "number") {
        buttons_amount = this.buttons;
      } else if (typeof this.buttons == "string") {
        buttons_amount = Number(this.buttons) || 0;
      } else if (typeof this.buttons == "object") {
        if ($.isArray(this.buttons)) {
          buttons_amount = this.buttons.length;
        } else {
          buttons_amount = Object.keys(this.buttons).length;
        }

        for (let i in this.buttons) {
          if (this.buttons[i].hidden) {
            buttons_amount--;
          }
        }
      }

      if (buttons_amount < 2) {
        return false;
      } else if (buttons_amount >= 2 && buttons_amount < 5) {
        if (this.window_width >= 992) {
          return false;
        }
      } else if (buttons_amount >= 5 && buttons_amount < 8) {
        if (this.window_width >= 1200) {
          return false;
        }
      } else if (buttons_amount >= 8) {
        if (this.window_width >= 1620) {
          return false;
        }
      }

      return true;
    }
  }
});
/**
 * Component for drop-down list of buttons.
 */
export const gui_buttons_list = Vue.component("gui_buttons_list", {
  props: ["type", "text", "buttons", "instance_id", "look"],
  template: "#template_buttons_list",
  computed: {
    classes() {
      let classes = [];

      if (this.look && this.look.classes) {
        classes = this.look.classes;
      }
      return classes;
    }
  }
});
/**
 * Component for drop-down list of multi-actions.
 */
export const gui_multi_actions = Vue.component("gui_multi_actions", {
  props: ["instances", "multi_actions", "opt"],
  template: "#template_multi_actions",
  computed: {
    store_url() {
      return this.opt.store_url;
    },
    current_path() {
      return this.$route.name;
    },
    text() {
      return (
        this.$t("actions on") +
        " " +
        this.selected +
        " " +
        this.$tc("on item", this.selected)
      );
    },
    classes() {
      return ["btn-primary"];
    },
    selections() {
      return this.$store.getters.getSelections(this.store_url);
    },
    selected() {
      let count = 0;
      for (let i = 0; i < this.instances.length; i++) {
        let instance = this.instances[i];
        if (this.selections[instance.getPkValue()]) {
          count++;
        }
      }
      return count;
    }
  }
});
/**
 * Component for independent button:
 * - It can be link button(it has 'path' property in it's 'options'),
 *   that do redirect to another view.
 * - It can be just button(it has no 'path' property in it's 'options'),
 *   that calls some method of root component.
 */
export const gui_button_common = Vue.component("gui_button_common", {
  mixins: [base_button_mixin],
  computed: {
    classes() {
      let classes = this.getRepresentationProperty("classes");

      if (!classes) {
        classes = [];
      }

      if (Array.isArray(classes)) {
        classes.push(this.class_with_name);
      } else if (typeof classes == "string") {
        classes = [classes, this.class_with_name];
      }

      return classes;
    }
  }
});
/**
 * Component for buttons from drop-down list of buttons.
 * The same as 'gui_button_common' component, but with another DOM wrapper.
 */
export const gui_button_li = Vue.component("gui_button_li", {
  mixins: [base_button_mixin],
  props: ["options", "instance_id"],
  template: "#template_button_li"
});
/**
 * Component for modal window.
 */
export const gui_modal = Vue.component("gui_modal", {
  props: ["opt"],
  template: "#template_modal",
  /**
   * Adds event callback for keyup.
   */
  mounted() {
    window.addEventListener("keyup", this.escHandler);
  },
  /**
   * Removes event callback for keyup.
   */
  beforeDestroy() {
    window.removeEventListener("keyup", this.escHandler);
  },
  computed: {
    with_header() {
      if (this.opt && this.opt.header == false) {
        return false;
      }

      return true;
    },
    with_footer() {
      if (this.opt && this.opt.footer == false) {
        return false;
      }

      return true;
    }
  },
  methods: {
    close() {
      this.$emit("close");
    },
    /**
     * Handler for 'escape' keyup event.
     */
    escHandler(e) {
      if (e.code == "Escape") {
        this.close();
      }
    }
  }
});
/**
 * Component for help modal window and button, that opens it.
 */
export const gui_help_modal = Vue.component("gui_help_modal", {
  mixins: [modal_window_and_button_mixin],
  template: "#template_help_modal",
  data() {
    return {
      info: app.api.openapi.info
    };
  },
  methods: {
    isArray(item) {
      return Array.isArray(item);
    }
  }
});

export const gui_customizer = Vue.component("gui_customizer", {
  template: "#template_gui_customizer",
  data() {
    return {
      customizer: guiCustomizer
    };
  },

  created() {
    this.customizer.init();
  },

  computed: {
    /**
     * Property, that returns current skin settings.
     */
    skin_settings() {
      return this.customizer.skin.settings;
    },
    /**
     * Property, that returns current skin name.
     */
    skin_name() {
      return this.customizer.skin.name;
    },
    /**
     * Property, that returns guiFields.form instance,
     * that is aimed to be form for skin settings.
     */
    formField() {
      return this.customizer.formField;
    },
    /**
     * Property, that returns guiFields.choices instance,
     * that is aimed to be field for skin selecting.
     */
    skinField() {
      return this.customizer.skinField;
    }
  },

  methods: {
    /**
     * Method - handler for formField's onChange event.
     * @param {object} value New form value.
     */
    formOnChangeHandler(value) {
      return this.customizer.setSkinSettings(value);
    },
    /**
     * Method - handler for skinField's onChange event.
     * @param {string} skin New skin.
     */
    skinOnChangeHandler(skin) {
      return this.customizer.setSkin(skin);
    }
  }
});
////////////////////////////////////////////////////////////////////////////////////
// EndBlock of common components for all view types
////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////
// Block of components for 'list' views
////////////////////////////////////////////////////////////////////////////////////
/**
 * Base component for content part (area for representation of view data) of 'list' views.
 */
export const gui_entity_list = Vue.component("gui_entity_list", {
  props: ["data", "view", "opt"],
  template: "#template_entity_list",
  computed: {
    fields() {
      return this.view.objects.model.fields;
    },
    is_empty() {
      return isEmptyObject(this.data.instances);
    }
  }
});
/**
 * Base component for multi_actions_button_component part of 'list' views.
 */
export const gui_entity_list_footer = Vue.component("gui_entity_list_footer", {
  mixins: [base_list_table_mixin],
  props: ["data", "view", "opt"],
  template: "#template_entity_footer_list",
  computed: {
    schema() {
      return this.view.schema;
    }
  }
});
/**
 * Component for 'list' views data representation.
 * This component represents view data as table.
 */
export const gui_list_table = Vue.component("gui_list_table", {
  mixins: [base_list_table_mixin],
  props: ["instances", "fields", "view", "opt"],
  template: "#template_list_table",
  computed: {
    store_url() {
      return this.opt.store_url;
    },
    allSelected() {
      let selections = this.$store.getters.getSelections(this.store_url);
      for (let index = 0; index < this.instances.length; index++) {
        let instance = this.instances[index];
        if (!selections[instance.getPkValue()]) {
          return false;
        }
      }
      return true;
    },
    classes: function() {
      return this.allSelected ? "selected" : "";
    },
    schema() {
      return this.view.schema;
    }
  },
  methods: {
    changeAllRowsSelection() {
      let ids = {};
      for (let index = 0; index < this.instances.length; index++) {
        let instance = this.instances[index];
        ids[instance.getPkValue()] = !this.allSelected;
      }
      this.$store.commit("setSelectionValuesByIds", {
        url: this.store_url,
        ids: ids
      });
    }
  }
});
/**
 * Component for pagination.
 */
export const pagination = Vue.component("pagination", {
  mixins: [main_pagination_mixin] /* globals main_pagination_mixin */
});
/**
 * Child component of 'gui_list_table' component.
 * This component represents view data item as table row.
 */
export const gui_list_table_row = Vue.component("gui_list_table_row", {
  mixins: [base_list_table_mixin, table_row_mixin],
  props: ["instance", "fields", "view", "opt"],
  template: "#template_list_table_row",
  computed: {
    store_url() {
      return this.opt.store_url;
    },
    selected: function() {
      return this.$store.getters.getSelectionById({
        url: this.store_url,
        id: this.instance.getPkValue()
      });
    },
    classes: function() {
      return this.selected ? "selected" : "";
    },
    base_url: function() {
      return this.$route.path.replace(/\/$/g, "");
    },
    data_to_represent: function() {
      // return this.instance.toRepresent();
      return this.instance.data;
    },
    schema() {
      return this.view.schema;
    },
    child_links_buttons() {
      return this.view.getViewSublinkButtons(
        "child_links",
        this.schema.child_links,
        this.instance
      );
    }
  },
  methods: {
    toggleSelection() {
      this.$store.commit("toggleSelectionValue", {
        url: this.store_url,
        id: this.instance.getPkValue()
      });
    }
  }
});
/**
 * Component for filter modal window and button, that opens it.
 */
export const gui_filters_modal = Vue.component("gui_filters_modal", {
  mixins: [modal_window_and_button_mixin],
  props: ["opt", "view", "data"],
  template: "#template_filters_modal",
  computed: {
    is_there_any_filter_to_display() {
      return Object.values(this.view.schema.filters).some(
        filter => !filter.options.hidden
      );
    }
  },
  methods: {
    filter() {
      this.$root.$emit(
        "eventHandler-" + this.$root.$children.last._uid,
        "filterInstances"
      );
    }
  }
});
/**
 * Component for modal window with list of child instances,
 * that can be added to the parents list.
 */
export const gui_add_child_modal = Vue.component("gui_add_child_modal", {
  mixins: [
    base_modal_window_for_instance_list_mixin
  ] /* globals base_modal_window_for_instance_list_mixin */,
  props: ["options"],
  template: "#template_add_child_modal",
  data() {
    return {
      /**
       * Property, that stores view of child list.
       */
      child_view: undefined,
      /**
       * Property, that stores selection pairs -
       * (instance_id, selection_value).
       */
      selections: {}
    };
  },
  created() {
    this.child_view = app.views[this.options.list_paths[0]];
    this.qs = app.views[this.options.list_paths[0]].objects.clone();
  },
  computed: {
    /**
     * Property, that returns fields of list fields.
     */
    fields() {
      return this.qs.model.fields;
    },
    /**
     * Property, that returns child_view schema.
     */
    schema() {
      return this.child_view.schema;
    },
    /**
     * Property, that returns object with different properties for modal table.
     */
    opt() {
      return {
        url: this.qs.url,
        view: this.child_view,
        schema: this.schema,
        fields: this.fields,
        enable_multiple_select: true,
        selections: this.selections
      };
    },
    /**
     * Property, that returns filter for search input.
     */
    field_props() {
      return {
        view_field: this.qs.model.view_name
      };
    }
  },
  methods: {
    /**
     * Method, that opens modal window.
     */
    open() {
      let filters = this.generateFilters();

      this.updateInstances(filters);
    },
    /**
     * Method, that sets new value for selections object.
     */
    changeValue(opt) {
      this.selections = { ...opt.selections };
    },
    /**
     * Method, that inits adding of selected child instances to parent list.
     */
    addSelected() {
      for (let id in this.selections) {
        if (this.selections.hasOwnProperty(id)) {
          let val = this.selections[id];

          if (!val) {
            continue;
          }

          this.addChildToParent(id);
        }
      }

      this.close();
    },
    /**
     * Method, that calls 'addChildInstance' method of parent view.
     */
    addChildToParent(id) {
      this.$root.$emit(
        "eventHandler-" + this.$root.$children.last._uid,
        "addChildInstance",
        { data: { id: id } }
      );
    },
    /**
     * Redefinitions of base 'onClose' method.
     */
    onClose() {
      this.selections = { ...{} };
    },
    /**
     * Method, that sets new value to selections object.
     * @param {object} opt New selections value.
     */
    setSelections(opt) {
      this.selections = { ...opt };
    },
    /**
     * Method, that changes instance selection value to opposite.
     * @param {object} opt Object with instance id value.
     */
    toggleSelection(opt) {
      if (this.selections[opt.id] === undefined) {
        this.selections[opt.id] = true;
      } else {
        this.selections[opt.id] = !this.selections[opt.id];
      }

      this.selections = { ...this.selections };
    },
    /**
     * Method - callback for 'updateInstances' method.
     * @param {object} qs New QuerySet object.
     */
    onUpdateInstances(qs) {
      this.qs = qs;
    }
  },
  components: {
    /**
     * Modal window table.
     */
    current_table: {
      mixins: [base_instances_table_mixin],
      watch: {
        selections(selections) {
          this.$emit("changeValue", { selections: selections });
        }
      },
      components: {
        current_table_row: {
          mixins: [base_instances_table_row_mixin]
        }
      }
    }
  }
});
////////////////////////////////////////////////////////////////////////////////////
// EndBlock of components for 'list' views
////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////
// Block of components for 'page' views
////////////////////////////////////////////////////////////////////////////////////
/**
 * Base component for content part (area for representation of view data) of 'page' views.
 */
export const gui_entity_page = Vue.component("gui_entity_page", {
  mixins: [base_page_type_mixin],
  data() {
    return {
      options: {
        readOnly: true
      }
    };
  }
});
/**
 * Component for 'page' views data representation.
 * This component represents view data as row of guiFields.
 * For each item in data this component renders appropriate guiField.
 */
export const fields_wrapper = Vue.component("fields_wrapper", {
  props: ["instance", "opt"],
  template: "#template_fields_wrapper",
  data() {
    return {
      /**
       * Property, that stores: field is hidden or not.
       */
      hidden_store: {}
    };
  },
  /**
   * Hook that sets initial values of hidden_store.
   */
  created() {
    if (this.opt.hideUnrequired) {
      for (let key in this.instance.fields) {
        if (this.instance.fields.hasOwnProperty(key)) {
          if (!this.instance.fields[key].options.required) {
            this.hidden_store[key] = true;
          } else {
            this.hidden_store[key] = false;
          }
        }
      }
    }
  },
  computed: {
    /**
     * Property, that returns data of instance.
     */
    instance_data() {
      return this.instance.data;
    },
    /**
     * Property, that returns fields of instance.
     */
    fields() {
      return this.instance.fields;
    },
    /**
     * Property, that returns instance's QuerySet URL.
     */
    qs_url() {
      return this.instance.queryset.url;
    },
    /**
     * Property, that is responsible for showing/hiding of <select>Add field</select>
     * with field names.
     */
    show_fields_select() {
      if (this.opt.readOnly) {
        return false;
      }

      return this.opt.hideUnrequired;
    }
  },
  methods: {
    /**
     * Method, that defines: hide field or not.
     * @param {object} field Field object.
     * @return {boolean}
     */
    hideFieldOrNot(field) {
      if (this.instance_data[field.options.name] !== undefined) {
        return false;
      }

      return this.hidden_store[field.options.name];
    },
    /**
     * Method, that returns wrapper_opt prop for each field.
     * @param {object} field Field object.
     */
    getFieldWrapperOpt(field) {
      let w_opt = $.extend(true, {}, this.opt, { qs_url: this.qs_url });

      if (this.opt.hideUnrequired) {
        let hidden = this.hideFieldOrNot(field);
        return $.extend(true, {}, w_opt, {
          hidden: hidden,
          hidden_button: true
        });
      }

      return w_opt;
    },
    /**
     * Method - onChange handler of <select>Add field</select>.
     * @param {string} field Name of field.
     */
    addFieldHandler(field) {
      this.hidden_store[field] = !this.hidden_store[field] || false;
      this.hidden_store = { ...this.hidden_store };
    },
    /**
     * Method, that changes field's valut in hidden_store.
     * @param {object} opt Object with properties.
     */
    toggleHidden(opt) {
      this.addFieldHandler(opt.field);
    }
  }
});

export const filters_wrapper = Vue.component("filters_wrapper", {
  props: ["view", "opt", "filters_data"],
  template: "#template_filters_wrapper",
  computed: {
    filters() {
      return this.view.schema.filters;
    },

    qs_url() {
      return this.opt.store_url;
    },

    data_to_represent() {
      return this.filters_data;
    },

    wrapper_opt() {
      return $.extend(true, {}, this.opt, { qs_url: this.qs_url });
    }
  }
});
////////////////////////////////////////////////////////////////////////////////////
// EndBlock of components for 'page' views
////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////
// Block of components for 'page_new' views
////////////////////////////////////////////////////////////////////////////////////
/**
 * Base component for content part (area for representation of view data) of 'page_new' views.
 */
export const gui_entity_page_new = Vue.component("gui_entity_page_new", {
  mixins: [base_page_type_mixin, page_new_and_action_type_mixin]
});
////////////////////////////////////////////////////////////////////////////////////
// EndBlock of components for 'page_new' views
////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////
// Block of components for 'page_edit' views
////////////////////////////////////////////////////////////////////////////////////
/**
 * Base component for content part (area for representation of view data) of 'page_edit' views.
 */
export const gui_entity_page_edit = Vue.component("gui_entity_page_edit", {
  mixins: [base_page_type_mixin],
  data() {
    return {
      options: {
        store: "sandbox"
      }
    };
  }
});
////////////////////////////////////////////////////////////////////////////////////
// EndBlock of components for 'page_edit' views
////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////
// Block of components for 'action' views
////////////////////////////////////////////////////////////////////////////////////
/**
 * Base component for content part (area for representation of view data) of 'action' views.
 */
export const gui_entity_action = Vue.component("gui_entity_action", {
  mixins: [
    base_page_type_mixin,
    page_new_and_action_type_mixin,
    action_type_mixin
  ]
});
////////////////////////////////////////////////////////////////////////////////////
// EndBlock of components for 'action' views
////////////////////////////////////////////////////////////////////////////////////
