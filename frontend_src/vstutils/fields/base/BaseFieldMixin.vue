<template>
    <div :class="wrapperClasses">
        <field_list_view
            v-if="type === 'list'"
            :value="value"
            :field="field"
            :data="data"
            @set-value="setValue"
        />
        <template v-else>
            <component
                :is="field.getLabelComponent()"
                v-if="!hideTitle"
                :type="type"
                :value="value"
                :field="field"
                :data="data"
                :error="error"
                @replace-key="replaceKey"
                @delete-key="deleteKey"
                @add-key="addKey"
            />
            <field_content_readonly
                v-if="field.readOnly || type === 'readonly'"
                :value="value"
                :field="field"
                :data="data"
                :hideable="hideable"
                @set-value="setValue"
            />
            <field_content_edit
                v-else
                :field="field"
                :value="value"
                :data="data"
                :hideable="hideable"
                @hide-field="$emit('hide-field', field)"
                @set-value="setValue"
                @clear="clearValue"
            />
        </template>
    </div>
</template>

<script>
    import BaseFieldContentReadonlyMixin from './BaseFieldContentReadonlyMixin.vue';
    import BaseFieldContentEdit from './BaseFieldContentEdit.vue';
    import BaseFieldListView from './BaseFieldListView.vue';
    import { FieldPropsDef } from './props';
    import { getFieldWrapperClasses } from './composables';

    export default {
        name: 'BaseFieldMixin',
        components: {
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
        inject: {
            requireValueOnClear: {
                from: 'requireValueOnClear',
                default: false,
            },
        },
        props: FieldPropsDef,
        data() {
            return {
                wrapper_styles_list: {},
                hidden: this.field.hidden || false,
            };
        },
        computed: {
            wrapperClasses() {
                return getFieldWrapperClasses(this.$props);
            },
            value() {
                return this.data[this.field.name];
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
            clearValue() {
                this.setValue(this.field.getInitialValue({ requireValue: this.requireValueOnClear }));
            },
            setValue(value, { markChanged = true } = {}) {
                this._emitSetValueSignal(value, { markChanged });
            },
            replaceKey({ oldKey, newKey }) {
                this.$emit('set-value', {
                    field: oldKey,
                    value: this.value,
                    replaceKeyWith: newKey,
                });
            },
            deleteKey(key) {
                this.$emit('set-value', {
                    field: key,
                    deleteKey: true,
                });
            },
            addKey(key) {
                this.$emit('add-key', key);
            },
            _emitSetValueSignal(value, { markChanged = true } = {}) {
                this.$emit('set-value', {
                    field: this.field.name,
                    value: value,
                    markChanged,
                });
            },
        },
    };
</script>
