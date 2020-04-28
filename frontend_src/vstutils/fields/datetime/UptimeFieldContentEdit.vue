<template>
    <div class="input-group">
        <input
            type="text"
            :class="classes"
            :style="styles"
            :required="attrs['required']"
            :value="value"
            @blur="$emit('proxyEvent', 'setValueInStore', $event.target.value)"
            :aria-labelledby="label_id"
            :aria-label="aria_label"
        />

        <field_uptime_down_button
            :field="field"
            @callDoDecrease="$emit('proxyEvent', 'callDoDecrease')"
            @resetIncrement="$emit('proxyEvent', 'resetIncrement')"
        ></field_uptime_down_button>

        <field_uptime_up_button
            :field="field"
            @callDoIncrease="$emit('proxyEvent', 'callDoIncrease')"
            @resetIncrement="$emit('proxyEvent', 'resetIncrement')"
        ></field_uptime_up_button>

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
    </div>
</template>

<script>
    import { BaseFieldContentEdit, BaseFieldButton } from '../base';
    import UptimeFieldButton from './UptimeFieldButton.vue';

    export default {
        mixins: [BaseFieldContentEdit],
        data() {
            return {
                class_list: ['form-control', 'uptime-input'],
            };
        },
        components: {
            // button, that decreases field's value
            field_uptime_down_button: {
                mixins: [BaseFieldButton, UptimeFieldButton],
                data() {
                    return {
                        icon_classes: ['fa', 'fa-chevron-left'],
                        event_handler: 'callDoDecrease',
                        help_text: 'Decrease value',
                    };
                },
            },
            // button, that increases field's value
            field_uptime_up_button: {
                mixins: [BaseFieldButton, UptimeFieldButton],
                data() {
                    return {
                        icon_classes: ['fa', 'fa-chevron-right'],
                        event_handler: 'callDoIncrease',
                        help_text: 'Increase value',
                    };
                },
            },
        },
    };
</script>

<style scoped></style>
