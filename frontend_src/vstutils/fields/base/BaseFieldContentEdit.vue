<template>
    <div class="input-group">
        <input
            :type="input_type"
            :class="classes"
            :style="styles"
            :value="value"
            @input="$emit('proxyEvent', 'setValueInStore', $event.target.value)"
            :min="attrs['min']"
            :max="attrs['max']"
            :required="attrs['required']"
            :minlength="attrs['minlength']"
            :maxlength="attrs['maxlength']"
            :aria-labelledby="label_id"
            :aria-label="aria_label"
        />

        <field_hidden_button
            v-if="with_hidden_button"
            :field="field"
            @hideField="$emit('proxyEvent', 'hideField')"
        ></field_hidden_button>

        <field_default_value_button
            v-if="with_default_value"
            :field="field"
            @valueToDefault="$emit('proxyEvent', 'valueToDefault')"
        ></field_default_value_button>

        <field_clear_button
            :field="field"
            @cleanValue="$emit('proxyEvent', 'cleanValue')"
        ></field_clear_button>
    </div>
</template>

<script>
    import $ from 'jquery';
    import BaseFieldContentMixin from './BaseFieldContentMixin.js';
    import BaseFieldInnerComponentMixin from './BaseFieldInnerComponentMixin.js';
    import FieldLabelIdMixin from '../FieldLabelIdMixin.js';
    import BaseFieldButton from './BaseFieldButton.vue';

    /**
     * Mixin for editable gui_fields' content(input value area).
     */
    export default {
        name: 'BaseFieldContentEdit',
        mixins: [BaseFieldContentMixin, BaseFieldInnerComponentMixin, FieldLabelIdMixin],
        data() {
            return {
                class_list: ['form-control'],
            };
        },
        computed: {
            /**
             * Property, that returns true, if this field can be hidden.
             * @return {boolean}
             */
            with_hidden_button() {
                let opt = $.extend(true, {}, this.field.options, this.wrapper_opt);

                return opt.hidden_button && !opt.required;
            },
            /**
             * Property, that returns true, if this field has default value.
             * @return {boolean}
             */
            with_default_value() {
                let opt = $.extend(true, {}, this.field.options, this.wrapper_opt);

                return opt.default !== undefined;
            },
        },
        components: {
            /**
             * Component for 'clean value' button.
             */
            field_clear_button: BaseFieldButton,
            /**
             * Component for 'hide field' button.
             */
            field_hidden_button: {
                mixins: [BaseFieldButton],
                data() {
                    return {
                        icon_classes: ['fa', 'fa-minus'],
                        event_handler: 'hideField',
                        help_text: 'Hide field',
                    };
                },
            },
            /**
             * Component for 'set default value' button.
             */
            field_default_value_button: {
                mixins: [BaseFieldButton],
                data() {
                    return {
                        icon_classes: ['fas', 'fa-redo'],
                        event_handler: 'valueToDefault',
                        help_text: 'Set default value',
                    };
                },
            },
        },
    };
</script>

<style scoped></style>
