/* eslint-disable vue/one-component-per-file */
import { BaseField, BaseFieldContentEdit, BaseFieldContentReadonlyMixin, BaseFieldMixin } from './base';
import { registerHook } from '../utils';
import { ModelFields } from '../components/page';

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

export const NestedObjectFieldEdit = {
    name: 'NestedObjectFieldEdit',
    mixins: [BaseFieldContentEdit],
    render(h) {
        return h(ModelFields, {
            props: {
                editable: true,
                data: this.data[this.field.name],
                model: this.field.nestedModel,
            },
            on: { setValue: (event) => this.$emit('setValue', event) },
        });
    },
};

/**
 * @vue/component
 */
export const NestedObjectFieldMixin = {
    components: {
        field_content_readonly: NestedObjectFieldReadonly,
        field_content_edit: NestedObjectFieldEdit,
        field_list_view: NestedObjectFieldReadonly,
    },
    mixins: [BaseFieldMixin],
    methods: {
        renderList() {
            return this.$createElement('div', [JSON.stringify(this.value)]);
        },
        renderDetail() {
            return this.$createElement(ModelFields, {
                props: {
                    editable: this.type === 'edit' && !this.field.readOnly,
                    data: this.value,
                    model: this.field.nestedModel,
                },
                on: {
                    'set-value': ({ field, value }) => this.setValue({ ...this.value, [field]: value }),
                },
            });
        },
    },

    render(h) {
        return h('div', { staticClass: 'field-component', class: this.wrapperClasses }, [
            this.type === 'list' ? this.renderList() : this.renderDetail(),
        ]);
    },
};

export class NestedObjectField extends BaseField {
    constructor(options) {
        super(options);
        this.nestedModel = null;
        registerHook('app.beforeInit', this.resolveNestedModel.bind(this));
    }
    getEmptyValue() {
        return {};
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
