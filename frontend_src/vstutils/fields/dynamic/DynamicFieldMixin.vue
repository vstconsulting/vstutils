<template>
    <component
        :is="realField.component"
        :field="realField"
        :data="data"
        :type="type"
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
        watch: {
            data(newData, oldData) {
                if (!deepEqual(this.field._getParentValues(newData), this.field._getParentValues(oldData))) {
                    this.realField = this.field.getRealField(newData);
                }
            },
        },
        created() {
            this.realField = this.field.getRealField(this.data);
        },
    };
</script>
