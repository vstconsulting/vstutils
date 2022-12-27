<template>
    <div class="input-group">
        <textarea
            class="form-control"
            :value="value || ''"
            :rows="rows"
            :cols="cols"
            v-bind="attrs"
            style="resize: vertical"
            @input="handleInput"
        />
    </div>
</template>

<script setup lang="ts">
    import { toRef } from 'vue';
    import type { Field } from '@/vstutils/fields/base';
    import { useTextAreaAttrs } from '@/vstutils/fields/base';

    const props = withDefaults(
        defineProps<{
            field: Field;
            value?: string;
            rows?: number;
            cols?: number;
        }>(),
        {
            rows: 3,
            cols: 50,
        },
    );

    const emit = defineEmits<{
        (e: 'input', value: string): void;
    }>();

    const attrs = useTextAreaAttrs(toRef(props, 'field'));

    function handleInput(e: Event) {
        emit('input', (e.target as HTMLInputElement).value);
    }
</script>
