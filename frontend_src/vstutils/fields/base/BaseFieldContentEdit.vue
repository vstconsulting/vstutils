<template>
    <div class="input-group">
        <input
            :aria-label="aria_label"
            :aria-labelledby="label_id"
            :class="classes"
            :max="attrs['max']"
            :maxlength="attrs['maxlength']"
            :min="attrs['min']"
            :minlength="attrs['minlength']"
            :required="attrs['required']"
            :style="styles"
            :type="inputType"
            :value="preparedValue"
            @input="$emit('set-value', $event.target.value)"
        />
        <HideButton v-if="hasHideButton" @click.native="$emit('hide-field', field)" />
        <SetDefaultButton v-if="hasDefaultValue" @click.native="$emit('set-value', field.default)" />
        <ClearButton @click.native="$emit('set-value', field.getInitialValue())" />
    </div>
</template>

<script>
    import BaseFieldContentMixin from './BaseFieldContentMixin.js';
    import BaseFieldInnerComponentMixin from './BaseFieldInnerComponentMixin.js';
    import FieldLabelIdMixin from '../FieldLabelIdMixin.js';
    import { ClearButton, HideButton, SetDefaultButton } from '../buttons';
    /**
     * Mixin for editable gui_fields' content(input value area).
     */
    export default {
        name: 'BaseFieldContentEdit',
        components: { ClearButton, SetDefaultButton, HideButton },
        mixins: [BaseFieldContentMixin, BaseFieldInnerComponentMixin, FieldLabelIdMixin],
        props: ['field', 'value', 'data'],
        data() {
            return {
                class_list: ['form-control'],
            };
        },
        computed: {
            hasHideButton() {
                return this.$parent.hideable;
            },
            hasDefaultValue() {
                return this.field.hasDefaultValue;
            },
            preparedValue() {
                return this.value;
            },
        },
    };
</script>
