<template>
    <div class="input-group">
        <input
            :type="inputType"
            :class="classes"
            :style="styles"
            :value="value"
            :min="attrs['min']"
            :max="attrs['max']"
            :required="attrs['required']"
            :minlength="attrs['minlength']"
            :maxlength="attrs['maxlength']"
            :aria-labelledby="label_id"
            :aria-label="aria_label"
            @input="$emit('set-value', $event.target.value)"
        />

        <HideButton v-if="hasHideButton" @click.native="$emit('hide-field', field)" />
        <FieldButton
            :icon-classes="inputType === 'text' ? ['fa', 'fa-eye-slash'] : ['fa', 'fa-eye']"
            :help-text="inputType === 'text' ? 'Hide field\'s value' : 'Show field\'s value'"
            @click.native="toggleShowValue"
        />
        <FieldButton
            help-text="Copy field's value to clipboard"
            :icon-classes="['far', 'fa-copy']"
            @click.native="copy"
        />
        <SetDefaultButton v-if="hasDefaultValue" @click.native="$emit('set-value', field.default)" />
        <ClearButton @click.native="$emit('set-value', field.getInitialValue())" />
    </div>
</template>

<script>
    import PasswordFieldContent from './PasswordFieldContent.js';
    import { copyToClipboard } from '../../utils';
    import BaseFieldContentEdit from '../base/BaseFieldContentEdit.vue';
    import { FieldButton } from '../buttons';

    export default {
        components: { FieldButton },
        mixins: [BaseFieldContentEdit, PasswordFieldContent],
        methods: {
            toggleShowValue() {
                this.inputType = this.inputType === 'password' ? 'text' : 'password';
            },
            copy() {
                copyToClipboard(this.value);
            },
        },
    };
</script>

<style></style>
