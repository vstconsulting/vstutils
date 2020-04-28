<template>
    <div class="input-group">
        <input
            :type="input_type"
            :class="classes"
            :style="styles"
            :value="value"
            :aria-labelledby="label_id"
            :aria-label="aria_label"
            disabled
        />
    </div>
</template>

<script>
    import { addCssClassesToElement } from '../../utils';
    import { BaseFieldContentReadonlyMixin } from '../base';

    /**
     * Mixin for readOnly choices field content(input value area).
     */
    export default {
        mixins: [BaseFieldContentReadonlyMixin],
        computed: {
            choices_classes() {
                return addCssClassesToElement('field', this.value, this.field.options.name);
            },
            classes() {
                return [].concat(this.class_list, this.choices_classes).join(' ');
            },
        },
    };
</script>

<style scoped></style>
