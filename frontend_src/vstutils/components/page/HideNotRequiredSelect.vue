<template>
    <div class="form-group">
        <label :for="id">
            {{ $u.capitalize($t('add') + ' ' + $t('field')) }}
        </label>
        <select
            :id="id"
            ref="select"
            class="form-control custom-select"
            :disabled="fields.length === 0"
            @change.prevent="handleSelect"
        >
            <option value="__default" disabled selected>
                {{ $u.capitalize($t('select') + ' ' + $t('field')) }}
            </option>
            <option v-for="field in fields" :key="field.name" :value="field.name">
                {{ $t(field.title) }}
            </option>
        </select>
    </div>
</template>

<script setup lang="ts">
    import { ref } from 'vue';
    import { getUniqueId } from '#vstutils/utils';
    import type { Field } from '#vstutils/fields/base';

    const props = defineProps<{
        fields: Field[];
    }>();

    const emit = defineEmits<{
        (e: 'show-field', field: Field): void;
    }>();

    const id = `hideNotRequiredSelector-${getUniqueId()}`;

    const select = ref<HTMLSelectElement | null>(null);

    function handleSelect(e: Event) {
        const fieldName = (e.target as HTMLSelectElement).value;
        const field = props.fields.find((f) => f.name === fieldName);
        if (field) {
            emit('show-field', field);
            select.value!.value = '__default';
        }
    }
</script>
