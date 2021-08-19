<template>
    <div class="input-group">
        <div class="input-group-prepend">
            <div class="input-group-text">
                <span>+</span>
            </div>
        </div>
        <component
            :is="countryCodeField.component"
            class="code-selector"
            :field="countryCodeField"
            :data="{ [countryCodeField.name]: countryCode }"
            type="edit"
            :hide-title="true"
            @set-value="countryCode = $event.value"
        />

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
        />
        <HideButton v-if="hasHideButton" @click.native="$emit('hide-field', field)" />
        <SetDefaultButton v-if="hasDefaultValue" @click.native="$emit('set-value', field.default)" />
        <ClearButton @click.native="$emit('set-value', field.getInitialValue())" />
    </div>
</template>

<script>
    import { MaskedFieldEdit } from './masked';
    export default {
        name: 'PhoneFieldContentEdit',
        mixins: [MaskedFieldEdit],
        data() {
            return {
                countryCodeField: this.field.countryCodeField,
            };
        },
        computed: {
            preparedValue() {
                return this.justNumber;
            },
        },
        watch: {
            countryCode() {
                this.setValue(this.beforeSet(this.preparedValue));
            },
            value(newVal) {
                this.justNumber = this.trimCode(newVal);
            },
        },
        created() {
            this.justNumber = this.trimCode(this.value);
        },
        methods: {
            beforeSet(value) {
                if (!value) return null;
                return this.countryCode + value;
            },
        },
    };
</script>

<style scoped>
    .code-selector {
        margin: 0;
        width: 80px;
    }

    .code-selector::v-deep .select2-selection {
        border-radius: 0;
        border-right: none;
    }
</style>
