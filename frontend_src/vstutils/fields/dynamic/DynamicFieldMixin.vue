<template>
    <component
        :is="realField.component"
        :field="realField"
        :data="data"
        :type="type"
        :hideable="hideable"
        @toggleHidden="$emit('toggleHidden')"
        @set-value="$emit('set-value', $event)"
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
                }
            },
        },
        created() {
            this.realField = this.field.getRealField(this.data);
        },
    };
</script>
