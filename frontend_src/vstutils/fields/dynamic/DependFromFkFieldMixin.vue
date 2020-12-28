<template>
    <component
        :is="fieldComponent"
        :field="realField"
        :data="data"
        :type="type"
        @set-value="$emit('set-value', $event)"
    />
</template>

<script>
    import BaseFieldMixin from '../base/BaseFieldMixin.vue';
    import { StringField } from '../text';

    export default {
        mixins: [BaseFieldMixin],
        data() {
            return {
                realField: new StringField({ name: this.field.name }),
            };
        },
        computed: {
            fieldComponent() {
                return this.realField.component;
            },
        },
        created() {
            this.$watch(`data.${this.field.dependField}`, this.updateRealField, { immediate: true });
        },
        methods: {
            value() {
                const val = this.data[this.field.name];
                if (val.realField) {
                    return val.value;
                }
                return val;
            },
            async updateRealField() {
                this.realField = await this.field.getRealField(this.data);
                this.setValue(this.realField.getInitialValue());
            },
            setValue(value) {
                this._emitSetValueSignal({ realField: this.realField, value });
            },
        },
    };
</script>
