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
            updateRealField() {
                this.realField = this.field.getRealField(this.data);
                this.setValue(this.realField.getInitialValue());
            },
        },
    };
</script>
