<template>
    <div class="input-group">
        <input
            type="text"
            :class="classes"
            :style="styles"
            :required="attrs['required']"
            :value="value"
            :aria-labelledby="label_id"
            :aria-label="aria_label"
            @blur="$emit('set-value', $event.target.value)"
        />

        <DownButton @action="$parent.callDoDecrease" @reset-increment="$parent.resetIncrement" />
        <UpButton @action="$parent.callDoIncrease" @reset-increment="$parent.resetIncrement" />

        <HideButton v-if="hasHideButton" @click.native="$emit('hide-field', field)" />
        <SetDefaultButton v-if="hasDefaultValue" @click.native="$parent.valueToDefault" />
    </div>
</template>

<script>
    import { BaseFieldContentEdit } from '../base';
    import UptimeFieldButton from './UptimeFieldButton.vue';

    export default {
        components: {
            DownButton: {
                mixins: [UptimeFieldButton],
                data() {
                    return {
                        iconClasses: ['fa', 'fa-chevron-left'],
                        helpText: 'Decrease value',
                    };
                },
            },
            UpButton: {
                mixins: [UptimeFieldButton],
                data() {
                    return {
                        iconClasses: ['fa', 'fa-chevron-right'],
                        helpText: 'Increase value',
                    };
                },
            },
        },
        mixins: [BaseFieldContentEdit],
        data() {
            return {
                class_list: ['form-control', 'uptime-input'],
            };
        },
    };
</script>
