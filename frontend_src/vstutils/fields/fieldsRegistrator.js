import Vue from "vue";
import guiFields from "./guiFields.js";

/**
 * Class, that registers Vue components for guiFields.
 */
class GuiFieldComponentRegistrator {
  /**
   * Constructor of GuiFieldComponentRegistrator Class.
   * @param {object} fields_classes Object with guiFields classes.
   */
  constructor(fields_classes) {
    this.fields = fields_classes;
  }
  /**
   * Method, that registers new Vue component for guiField,
   * if there is no such component yet.
   * @param {string} format Format name of guiField class.
   * @param {array} mixins guiField class mixins.
   */
  registerFieldComponent(format, mixins) {
    let component = "field_" + format;
    if (Vue.options.components[component]) {
      return;
    }

    Vue.component(component, {
      mixins: mixins || []
    });
  }
  /**
   *  Method, that registers all guiFields.
   */
  registerAllFieldsComponents() {
    for (let key in this.fields) {
      if (this.fields.hasOwnProperty(key)) {
        this.registerFieldComponent(key, this.fields[key].mixins);
      }
    }
  }
}

const fieldsRegistrator = new GuiFieldComponentRegistrator(
  guiFields
);

export default fieldsRegistrator;
