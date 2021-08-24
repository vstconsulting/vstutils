<template>
    <div class="input-group">
        <div v-if="prependText" class="input-group-prepend">
            <div class="input-group-text" v-text="$t(prependText)" />
        </div>
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
            :[inputValueName]="preparedValue"
            @[inputEventName]="setValue"
        />
        <div v-if="appendText" class="input-group-append">
            <div class="input-group-text" v-text="$t(appendText)" />
        </div>
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
        props: {
            field: { type: Object, required: true },
            value: { type: [Number, String, Array, Boolean, Object], default: null },
            data: { type: Object, required: true },
        },
        data() {
            return {
                inputValueName: 'value',
                inputEventName: 'input',
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
        methods: {
            setValue(event) {
                this.$emit('set-value', event.target.value);
            },
        },
    };
</script>
