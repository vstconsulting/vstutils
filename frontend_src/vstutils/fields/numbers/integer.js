import { BaseFieldContentEdit } from '../base';
import { NumberField, NumberFieldContentMixin, NumberFieldMixin } from './number';

export const IntegerFieldContentMixin = {
    mixins: [NumberFieldContentMixin],
};

export const IntegerFieldMixin = {
    mixins: [NumberFieldMixin],
    components: {
        field_content_edit: {
            mixins: [BaseFieldContentEdit, IntegerFieldContentMixin],
        },
    },
};

/**
 * Field to store integers
 */
export class IntegerField extends NumberField {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return [IntegerFieldMixin];
    }
}
