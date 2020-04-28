import $ from 'jquery';
import { BaseField } from '../base';
import { ViewConstructor } from '../../views';
import { openapi_dictionary } from '../../api';
import InnerAPIObjectFieldMixin from './InnerAPIObjectFieldMixin';

/**
 * Inner_api_object guiField class.
 */
class InnerAPIObjectField extends BaseField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(InnerAPIObjectFieldMixin);
    }

    /**
     * Static method, that recursively find model, connected with this field.
     * @param {object} field Inner_api_object field instance.
     */
    static getModel(field) {
        let constructor = new ViewConstructor(openapi_dictionary, app.models);
        return constructor.getViewSchema_model(field.options);
    }

    /**
     * Static method, that prepares field for usage.
     * @param {object} field Inner_api_object field instance.
     * @param {string} path Name of View path.
     */
    static prepareField(field, path) {
        /* jshint unused: false */
        let model = this.getModel(field);

        if (!model) {
            console.error(
                "Model was not found in static method 'prepareField'" +
                    ' of guiFields.inner_api_object class',
            );
            return field;
        }

        let realFields = {};

        for (let [key, inner_field] of Object.entries(model.fields)) {
            let inner_model = this.getModel(inner_field);
            realFields[key] = {};

            for (let item in inner_model.fields) {
                if (Object.keys(inner_model.fields).length == 1) {
                    let f = inner_model.fields[item];
                    let opt = $.extend(true, { required: field.options.required }, f.options, {
                        title: `${key} - ${item}`,
                    });

                    realFields[key][item] = new window.guiFields[f.options.format](opt);
                } else {
                    realFields[key][item] = inner_model.fields[item];
                    realFields[key][item].options = $.extend(
                        true,
                        { required: field.options.required },
                        inner_model.fields[item].options,
                    );
                }
            }
        }

        field.options.realFields = realFields;

        return field;
    }
    /**
     * Redefinition of base guiField static property 'validateValue'.
     */
    validateValue(data = {}) {
        let val = data[this.options.name] || {};
        let valid = {};

        for (let [fieldName, field] of Object.entries(this.options.realFields)) {
            valid[fieldName] = {};

            for (let [itemKey, item] of Object.entries(field)) {
                valid[fieldName][itemKey] = item.validateValue(val[fieldName]);
            }
        }

        return valid;
    }
}

export default InnerAPIObjectField;
