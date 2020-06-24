import { BaseField } from '../base';
import JSONFieldMixin from './JSONFieldMixin.js';

/**
 * JSON guiField class.
 */
class JSONField extends BaseField {
    /**
     * Method, that inits all real fields of json field.
     */
    generateRealFields(value = {}) {
        let realFields = {};

        for (let [name, field] of Object.entries(value)) {
            let opt = {
                name: name,
                readOnly: this.options.readOnly || false,
                title: name,
                format: 'string',
            };

            if (typeof field == 'boolean') {
                opt.format = 'boolean';
            }

            realFields[name] = new window.spa.fields.guiFields[opt.format](opt);
        }

        return realFields;
    }

    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(JSONFieldMixin);
    }
}

export default JSONField;
