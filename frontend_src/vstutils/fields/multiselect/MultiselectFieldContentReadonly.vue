<template>
    <div class="input-group">
        <input
            :type="inputType"
            :class="classes"
            :style="styles"
            :value="text"
            :aria-labelledby="label_id"
            :aria-label="aria_label"
            disabled
        />
    </div>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../base';
    import { FKFieldContent } from '../fk/fk';

    export default {
        mixins: [BaseFieldContentReadonlyMixin, FKFieldContent],
        computed: {
            text() {
                return this.field.toRepresent(this.data);
            },
        },
    };
</script>

<style scoped></style>
