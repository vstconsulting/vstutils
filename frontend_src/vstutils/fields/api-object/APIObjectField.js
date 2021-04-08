import { BaseField } from '../base';
import APIObjectFieldMixin from './APIObjectFieldMixin.js';

/**
 * Api_object guiField class.
 */
class APIObjectField extends BaseField {
    constructor(options) {
        super(options);

        this.nestedModelRef = options.$ref;
        // Will be set later in #prepareFieldForView
        this.nestedModel = null;
    }
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(APIObjectFieldMixin);
    }

    /**
     *
     * @param path {string}
     * @return {Field | undefined}
     */
    prepareFieldForView() {
        if (!this.nestedModel) {
            const model = this.constructor.app.modelsResolver.byReferencePath(this.nestedModelRef);
            if (!model) {
                throw new Error(`Model '${this.nestedModelRef}' not found for field '${this.name}'`);
            }
            this.nestedModel = model;
        }

        // let new_format = 'api_' + this.name.toLowerCase();
        //
        // if (window.spa.fields.guiFields[new_format]) {
        //     let opt = $.extend(true, {}, this.options, { format: new_format });
        //     let new_field = new window.spa.fields.guiFields[new_format](opt);
        //
        //     new_field.prepareFieldForView(path);
        //
        //     return new_field;
        // }
        //
        // this.querysets = [app.qsResolver.findQuerySetSecondLevelPaths(model.name)];
    }
}

export default APIObjectField;
