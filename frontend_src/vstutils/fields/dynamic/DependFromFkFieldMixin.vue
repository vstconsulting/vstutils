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
            if (this.type === 'edit') {
                this.$watch(`data.${this.field.dependField}`, () => {
                    this.updateRealField();
                    this.setValue(this.realField.getInitialValue());
                });
            }

            this.updateRealField();
        },
        methods: {
            updateRealField() {
                this.realField = this.field.getRealField(this.data);
            },
        },
    };
</script>
