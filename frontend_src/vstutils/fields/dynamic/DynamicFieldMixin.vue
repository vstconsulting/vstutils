<template>
    <component
        :is="realField.component"
        :field="realField"
        :data="data"
        :type="type"
        :hideable="hideable"
        @toggleHidden="$emit('toggleHidden')"
        @set-value="setValue($event.value)"
    />
</template>

<script>
    import BaseFieldMixin from '../base/BaseFieldMixin.vue';
    import { deepEqual } from '../../utils';

    export default {
        mixins: [BaseFieldMixin],
        data() {
            return {
                realField: this.field.getRealField(this.data),
                savedValues: new WeakMap(),
            };
        },
        computed: {
            parentValues() {
                return this.field._getParentValues(this.data);
            },
        },
        watch: {
            parentValues(newValues, oldValues) {
                if (!deepEqual(newValues, oldValues)) {
                    this.realField = this.field.getRealField(newValues);
                    this.setValue(
                        this.savedValues.has(this.realField)
                            ? this.savedValues.get(this.realField)
                            : this.realField.getInitialValue(),
                    );
                }
            },
        },
        created() {
            this.realField = this.field.getRealField(this.data);
        },
        methods: {
            setValue(value) {
                this.savedValues.set(this.realField, value);
                this._emitSetValueSignal(value);
            },
        },
    };
</script>
