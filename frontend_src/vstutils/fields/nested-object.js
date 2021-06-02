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
        this.nestedModel = null;
        registerHook('app.beforeInit', this.resolveNestedModel.bind(this));
    }
    resolveNestedModel() {
        this.nestedModel = this.constructor.app.modelsResolver.byReferencePath(this.options.$ref);
        if (!this.nestedModel) console.warn(`Cannot find model for ref ${this.options.$ref}`);
    }
    toRepresent(data) {
        return new this.nestedModel(super.toRepresent(data));
    }
    toInner(data) {
        const value = super.toInner(data);
        if (value) {
            return value._getInnerData();
        }
    }
    static get mixins() {
        return [NestedObjectFieldMixin];
    }
}
