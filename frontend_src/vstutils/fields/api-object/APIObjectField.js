import $ from 'jquery';
import { BaseField } from '../base';
import APIObjectFieldMixin from './APIObjectFieldMixin.js';

/**
 * Api_object guiField class.
 */
class APIObjectField extends BaseField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(APIObjectFieldMixin);
    }

    prepareField(app, path) {
        // TODO usage of ViewConstructor creates circular dependency
        // let constructor = new ViewConstructor(openapi_dictionary, window.app.models);
        // let model = constructor.getViewSchema_model(field.options);

        if (!model) {
            return;
        }

        let new_format = 'api_' + this.name.toLowerCase();

        if (window.spa.fields.guiFields[new_format]) {
            let opt = $.extend(true, {}, this.options, { format: new_format });
            let new_field = new window.spa.fields.guiFields[new_format](opt);

            new_field.prepareField(app, path);

            return new_field;
        }

        this.querysets = [app.qsResolver.findQuerySetSecondLevelPaths(model.name)];
    }
}

export default APIObjectField;
