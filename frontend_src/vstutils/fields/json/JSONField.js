import { BaseField } from '../base';
import JSONFieldMixin from './JSONFieldMixin.js';
import JsonMapper from './JsonMapper.js';

/**
 * JSON guiField class.
 */
class JSONField extends BaseField {
    constructor(options = {}, jsonMapper = undefined) {
        super(options);
        this.jsonMapper = jsonMapper || new JsonMapper();
    }

    toInner(data = {}) {
        let value = super.toInner(data);
        if (typeof value === 'string') {
            return JSON.parse(value);
        }
        return value;
    }

    toRepresent(data = {}) {
        if (this.options.readOnly) {
            return super.toRepresent(data);
        }
        return JSON.stringify(super.toRepresent(data));
    }

    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(JSONFieldMixin);
    }
}

export default JSONField;
