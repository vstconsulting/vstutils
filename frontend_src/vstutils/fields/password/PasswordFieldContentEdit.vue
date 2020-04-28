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

        <field_show_value_button
            :field="field"
            :input_type="input_type"
            @showValue="showValue"
        ></field_show_value_button>

        <field_copy_value_button
            :field="field"
            @copyValueToClipBoard="$emit('proxyEvent', 'copyValueToClipBoard')"
        ></field_copy_value_button>

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
    import { BaseFieldContentEdit, BaseFieldButton } from '../base';
    import PasswordFieldContent from './PasswordFieldContent.js';

    export default {
        mixins: [BaseFieldContentEdit, PasswordFieldContent],
        methods: {
            showValue() {
                this.input_type = this.input_type == 'password' ? 'text' : 'password';
            },
        },
        components: {
            field_show_value_button: {
                mixins: [BaseFieldButton],
                props: ['field', 'input_type'],
                data() {
                    return {
                        icon_classes: ['fa', 'fa-eye'],
                        event_handler: 'showValue',
                        help_text: "Show field's value",
                    };
                },
                watch: {
                    input_type: function (type) {
                        if (type == 'text') {
                            this.icon_classes = ['fa', 'fa-eye-slash'];
                            this.help_text = "Hide field's value";
                        } else {
                            this.icon_classes = ['fa', 'fa-eye'];
                            this.help_text = "Show field's value";
                        }
                    },
                },
            },
            field_copy_value_button: {
                mixins: [BaseFieldButton],
                data() {
                    return {
                        icon_classes: ['far', 'fa-copy'],
                        event_handler: 'copyValueToClipBoard',
                        help_text: "Copy field's value to clipboard",
                    };
                },
            },
        },
    };
</script>

<style></style>
