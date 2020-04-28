<template>
    <div class="row" :aria-labelledby="label_id" :aria-label="aria_label">
        <component
            v-for="(item, idx) in realFields"
            :key="idx"
            :is="'field_' + item.options.format"
            :field="item"
            :prop_data="value"
            :wrapper_opt="{ use_prop_data: true }"
        ></component>
    </div>
</template>

<script>
    /**
     * Mixin for read only json gui_field.
     */
    export default {
        computed: {
            realFields() {
                return this.field.generateRealFields(this.value);
            },
        },
    };
</script>

<style scoped></style>
