<template>
    <div class="input-group">
        <textarea
            :value="value"
            :required="attrs['required']"
            @input="$emit('proxyEvent', 'setValueInStore', $event.target.value)"
            rows="3"
            cols="50"
            :class="classes"
            :style="styles"
            :minlength="attrs['minlength']"
            :maxlength="attrs['maxlength']"
            :aria-labelledby="label_id"
            :aria-label="aria_label"
        ></textarea>
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

<style scoped></style>
