import { globalComponentsRegistrator } from '../ComponentsRegistrator.js';
import { guiFields } from './fields.js';

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
        globalComponentsRegistrator.add({ mixins: mixins || [] }, 'field_' + format);
    }
    /**
     *  Method, that registers all guiFields.
     */
    registerAllFieldsComponents() {
        for (let [key, val] of Object.entries(this.fields)) {
            this.registerFieldComponent(key, val.mixins);
        }
    }
}

const fieldsRegistrator = new GuiFieldComponentRegistrator(guiFields);

export default fieldsRegistrator;
