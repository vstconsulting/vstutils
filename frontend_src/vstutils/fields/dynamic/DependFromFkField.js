import { BaseField } from '../base';
import DependFromFkFieldMixin from './DependFromFkFieldMixin.vue';
import { mergeDeep } from '../../utils';

export default class DependFromFkField extends BaseField {
    constructor(options) {
        super(options);

        this.dependField = options.additionalProperties.field;
        this.dependFieldAttribute = options.additionalProperties.field_attribute;
    }

    static get mixins() {
        return [DependFromFkFieldMixin];
    }

    toInner(data) {
        const value = data[this.name];
        if (value.realField) {
            return value.realField.toInner({ ...data, [this.name]: value.value });
        }
    }

    toRepresent(data) {
        return super.toRepresent(data);
    }

    getFieldByFormat(format, data) {
        const fieldClass = window.app.fieldsClasses.get(format || 'string');

        let callback_opt = {};
        if (this.options.additionalProperties.callback) {
            callback_opt = this.options.additionalProperties.callback(data);
        }

        const realField = new fieldClass(mergeDeep({ format, name: this.name }, callback_opt));

        // TODO cannot prepare field because have no app and path
        // realField.prepareField(window.app, path);

        return realField;
    }

    async getRealField(data) {
        const formatInfoPk = data[this.dependField]?.value;
        if (!formatInfoPk) return this.getFieldByFormat('string', data);

        const formatInfoField = this.model.fields.get(this.dependField);
        const formatInfo = await formatInfoField.options.additionalProperties.querysets[0].get(formatInfoPk);

        return this.getFieldByFormat(formatInfo[this.dependFieldAttribute]);
    }
}
