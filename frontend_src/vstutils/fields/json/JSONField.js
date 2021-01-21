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

    getInitialValue() {
        return this.hasDefault ? this.default : null;
    }

    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(JSONFieldMixin);
    }
}

export default JSONField;
