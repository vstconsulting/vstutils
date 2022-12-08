<template>
    <p :aria-label="ariaLabel">
        <span v-if="field.prependText" v-text="$t(field.prependText) + ' '" />
        {{ valueAsStr }}
        <span v-if="field.appendText" v-text="' ' + $t(field.appendText)" />
    </p>
</template>

<script lang="ts">
    import type { PropType } from 'vue';
    import { defineComponent } from 'vue';
    import type { Field } from './BaseField';

    export default defineComponent({
        props: {
            field: { type: Object as PropType<Field>, required: true },
            value: { type: [String, Number], required: false },
        },
        computed: {
            ariaLabel(): string {
                return this.$t(this.field.title) as string;
            },
            valueAsStr() {
                if (this.value === undefined || this.value === null) {
                    return '';
                }
                return this.value;
            },
        },
    });
</script>

<style scoped>
    p {
        margin: 0;
    }
</style>
