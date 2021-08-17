<template>
    <div class="input-group">
        <textarea
            :value="value"
            :required="attrs['required']"
            rows="3"
            cols="50"
            :class="classes"
            :style="styles"
            :minlength="attrs['minlength']"
            :maxlength="attrs['maxlength']"
            :aria-labelledby="label_id"
            :aria-label="aria_label"
            @input="$emit('set-value', $event.target.value)"
        />
    </div>
</template>

<script>
    import { BaseFieldContentEdit } from '../base';
    export default {
        mixins: [BaseFieldContentEdit],
        data() {
            return {
                styles_dict: { resize: 'vertical' },
            };
        },
    };
</script>
