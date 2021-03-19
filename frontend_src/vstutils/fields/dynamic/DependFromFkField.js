import { BaseField } from '../base';
import DependFromFkFieldMixin from './DependFromFkFieldMixin.vue';
import { mergeDeep } from '../../utils';

export default class DependFromFkField extends BaseField {
    constructor(options) {
        super(options);

        this.dependField = options.additionalProperties.field;
        this.dependFieldAttribute = options.additionalProperties.field_attribute;

        /**
         * Function that is used to customize real field options
         * @type {Function}
         */
        this.callback = options.additionalProperties.callback;
    }

    static get mixins() {
        return [DependFromFkFieldMixin];
    }

    toInner(data) {
        return this.getRealField(data).toInner(data);
    }

    toRepresent(data) {
        return this.getRealField(data).toRepresent(data);
    }

    validateValue(value, data) {
        return this.getRealField(data).validateValue(value, data);
    }

    getFieldByFormat(format, data) {
        const fieldClass = window.app.fieldsClasses.get(format || 'string');

        let callback_opt = {};
        if (this.callback) {
            callback_opt = this.callback(data);
        }

        const realField = new fieldClass(mergeDeep({ format, name: this.name }, callback_opt));

        // TODO cannot prepare field because have no app and path
        // realField.prepareFieldForView(path);

        return realField;
    }

    /**
     * @param {Object} data - Field data.
     * @return {BaseField}
     */
    getRealField(data) {
        const dependFromInstance = data[this.dependField];
        const dependFieldValue =
            (dependFromInstance && dependFromInstance[this.dependFieldAttribute]) || 'string';

        return this.getFieldByFormat(dependFieldValue, data);
    }
}
