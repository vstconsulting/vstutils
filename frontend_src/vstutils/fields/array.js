import { BaseField, BaseFieldMixin } from './base';
import BaseFieldContentReadonlyMixin from './base/BaseFieldContentReadonlyMixin.vue';
import BaseFieldContentEdit from './base/BaseFieldContentEdit.vue';
import BaseFieldListView from './base/BaseFieldListView.vue';
import { registerHook } from '../utils';

/**
 * @vue/component
 */
export const ArrayFieldMixin = {
    components: {
        field_content_readonly: BaseFieldContentReadonlyMixin,
        field_content_edit: BaseFieldContentEdit,
        field_list_view: BaseFieldListView,
    },
    mixins: [BaseFieldMixin],
};

export class ArrayField extends BaseField {
    constructor(options) {
        super(options);
        /**
         * @type {BaseField}
         */
        this.itemField = null;
        registerHook('app.beforeInit', this.resolveItemField.bind(this));
    }

    resolveItemField() {
        this.itemField = this.constructor.app.getField(this.name, this.options.items);
    }

    toInner(data) {
        const value = super.toInner(data);
        if (Array.isArray(value)) {
            return value.map((item) => this.itemField.toInner({ [this.name]: item }));
        }
        return value;
    }

    toRepresent(data) {
        const value = super.toRepresent(data);
        if (Array.isArray(value)) {
            return value.map((item) => this.itemField.toRepresent({ [this.name]: item }));
        }
        return value;
    }

    static get mixins() {
        return [ArrayFieldMixin];
    }
}
