<template>
    <div class="field-component" :class="wrapperClasses">
        <field_list_view v-if="type === 'list'" :value="value" :field="field" :data="data" />
        <template v-else>
            <FieldLabel
                v-if="!hideTitle"
                :type="type"
                :value="value"
                :field="field"
                :data="data"
                :error="error"
            />
            <field_content_readonly
                v-if="field.readOnly || type === 'readonly'"
                :value="value"
                :field="field"
                :data="data"
                @proxyEvent="proxyEvent"
            />
            <field_content_edit
                v-else
                :field="field"
                :value="value"
                :data="data"
                @hide-field="$emit('hide-field', field)"
                @set-value="setValue"
            />
        </template>
    </div>
</template>

<script>
    import { addCssClassesToElement } from '../../utils';
    import BaseFieldLabel from './BaseFieldLabel.vue';
    import BaseFieldContentReadonlyMixin from './BaseFieldContentReadonlyMixin.vue';
    import BaseFieldContentEdit from './BaseFieldContentEdit.vue';
    import BaseFieldListView from './BaseFieldListView.vue';

    export default {
        name: 'BaseFieldMixin',
        components: {
            /**
             * Component for label (title) of field.
             */
            FieldLabel: BaseFieldLabel,
            /**
             * Component for area, that shows value of field with readOnly == true.
             */
            field_content_readonly: BaseFieldContentReadonlyMixin,
            /**
             * Component for area, that shows value of field with readOnly == false.
             */
            field_content_edit: BaseFieldContentEdit,
            /**
             * Component for list_view of field.
             */
            field_list_view: BaseFieldListView,
        },
        props: {
            field: { type: Object, required: true },
            data: { type: Object, required: true },
            type: { type: String, required: true },
            hideable: { type: Boolean, default: false },
            hideTitle: { type: Boolean, default: false },
            error: { type: String, default: null },
        },
        data() {
            return {
                wrapper_classes_list: {
                    base:
                        'form-group ' +
                        addCssClassesToElement(
                            'guiField',
                            this.field.name,
                            this.field.format || this.field.type,
                        ),
                    grid: 'col-lg-6 col-xs-12 col-sm-6 col-md-6',
                },
                wrapper_styles_list: {},
                hidden: this.field.hidden || false,
            };
        },
        computed: {
            wrapperClasses() {
                const classes = [
                    `name-${this.field.name}`,
                    `format-${this.field.format}`,
                    `type-${this.type}`,
                ];

                if (this.field.model) {
                    classes.push(`model-${this.field.model.name}`);
                }

                return classes;
            },
            value() {
                return this.data[this.field.name];
            },
            /**
             * Property, that returns string with classes of field wrapper.
             * @return {string}
             */
            wrapper_classes() {
                return Object.values(this.wrapper_classes_list).join(' ') + ' ';
            },
            /**
             * Property, that returns string with styles of field wrapper.
             * @return {string}
             */
            wrapper_styles() {
                return this.wrapper_styles_list;
            },
        },
        methods: {
            setValue(value) {
                this._emitSetValueSignal(value);
            },
            _emitSetValueSignal(value) {
                this.$emit('set-value', {
                    field: this.field.name,
                    value: value,
                });
            },
            /**
             * Method, that cleans field's value (sets field value to undefined).
             */
            cleanValue(opt) {
                this.setValueInStore(opt);
            },
            /**
             * Method, that sets field's value equal to default.
             */
            valueToDefault() {
                this.setValueInStore(this.field.options.default);
            },
            /**
             * Method, that sets field property 'hidden' equal to true.
             */
            hideField() {
                this.cleanValue();
                this.$emit('toggle-hidden', this.field.name);
            },
            /**
             * Method, that calls other field's methods.
             * It is expected to be called from inner components of field.
             * For example, from <field_content_edit></field_content_edit> component.
             * Buttons component, that 'field_content_edit' has inside itself,
             * will emit 'proxyEvent' event with the name of field's method,
             * that proxyEvent should call.
             */
            proxyEvent(callback_name, opt) {
                if (this[callback_name]) {
                    this[callback_name](opt);
                }
            },
        },
    };
</script>
