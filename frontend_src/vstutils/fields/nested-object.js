/* eslint-disable vue/one-component-per-file */
import { BaseField, BaseFieldContentReadonlyMixin, BaseFieldMixin } from './base';
import { registerHook } from '../utils';

/**
 * @vue/component
 */
export const NestedObjectFieldReadonly = {
    mixins: [BaseFieldContentReadonlyMixin],
    computed: {
        preparedValue() {
            return this.value ? this.value.getViewFieldString() : '';
        },
    },
};

/**
 * @vue/component
 */
export const NestedObjectFieldMixin = {
    components: {
        field_content_readonly: NestedObjectFieldReadonly,
        field_content_edit: NestedObjectFieldReadonly,
        field_list_view: NestedObjectFieldReadonly,
    },
    mixins: [BaseFieldMixin],
};

export class NestedObjectField extends BaseField {
    constructor(options) {
        super(options);
        this.readOnly = true;
        this.nestedModel = null;
        registerHook('app.beforeInit', this.resolveNestedModel.bind(this));
    }
    resolveNestedModel() {
        this.nestedModel = this.constructor.app.modelsResolver.bySchemaObject(this.options);
    }
    toRepresent(data) {
        return new this.nestedModel(super.toRepresent(data));
    }
    toInner(data) {
        const value = super.toInner(data);
        if (value?._getInnerData) {
            return value._getInnerData();
        }
        return value;
    }
    static get mixins() {
        return [NestedObjectFieldMixin];
    }
}
