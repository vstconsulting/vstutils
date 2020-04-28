import $ from 'jquery';
import FKandAPIObjectMixin from '../FKandAPIObjectMixin.js';
import { BaseField } from '../base';
import { ViewConstructor } from '../../views';
import { openapi_dictionary } from '../../api';
import APIObjectFieldMixin from './APIObjectFieldMixin.js';

/**
 * Api_object guiField class.
 */
class APIObjectField extends FKandAPIObjectMixin(BaseField) {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(APIObjectFieldMixin);
    }
    /**
     * Static method, that prepares field for usage.
     * @param {object} field Api_object field instance.
     * @param {string} path Name of View path.
     */
    static prepareField(field, path) {
        let constructor = new ViewConstructor(openapi_dictionary, app.models);
        let model = constructor.getViewSchema_model(field.options);

        if (!model) {
            return field;
        }

        let new_format = 'api_' + model.name.toLowerCase();

        if (window.guiFields[new_format]) {
            let opt = $.extend(true, {}, field.options, { format: new_format });
            let new_field = new window.guiFields[new_format](opt);

            if (window.guiFields[new_format].prepareField) {
                return window.guiFields[new_format].prepareField(new_field, path);
            }

            return new_field;
        }

        field.options.querysets = [this.findQuerySetSecondLevelPaths(model.name)];

        return field;
    }
}

export default APIObjectField;
