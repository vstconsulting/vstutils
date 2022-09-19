<template>
    <ul class="tags-selector">
        <li v-for="(item, idx) in value" :key="`${idx}-${item}`" class="selected-item">
            <span class="remove" :aria-label="$t('Remove')" @click="remove(idx)">×</span>
            {{ item }}
        </li>
        <input ref="input" class="field" type="text" @keyup.enter="add($refs.input.value)" />
    </ul>
</template>

<script setup>
    import { ref } from 'vue';

    const props = defineProps({
        value: { type: Array, default: () => [] },
        unique: { type: Boolean, default: false },
        validator: { type: Function, default: (value) => value || undefined },
    });
    const emit = defineEmits(['change']);

    const input = ref(null);

    function remove(idx) {
        const newArr = [...props.value];
        newArr.splice(idx, 1);
        emit('change', newArr);
    }
    function add(text) {
        const item = props.validator(text);
        if (item !== undefined) {
            if (props.unique && props.value.includes(item)) {
                return;
            }
            emit('change', [...props.value, item]);
            input.value.value = '';
        }
    }
</script>

<style scoped>
    .tags-selector {
        --tags-selector-border-color: #ced4da;
    }
    .dark-mode .tags-selector {
        --tags-selector-border-color: #6c757d;
    }

    .tags-selector {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        margin: 0;
        padding: 0;
        list-style: none;
        border-radius: 0.25rem;
        transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
        border: 1px solid var(--tags-selector-border-color);
    }
    .tags-selector:focus-within {
        border-color: #80bdff;
        box-shadow: 0 0 0 0.2rem rgb(0 123 255 / 25%);
    }
    .tags-selector > * {
        margin: 0.375rem 0 0 0.375rem;
    }
    .selected-item {
        padding: 0 0.3rem;
        color: #495057;
        background: #e9ecef;
        border: 1px solid #6c757d;
        border-radius: 0.25rem;
        white-space: nowrap;
    }
    .selected-item .remove {
        cursor: pointer;
        user-select: none;
    }
    .field {
        flex: 2;
        border: 0;
        margin: 0.375rem;
        color: unset;
        background-color: transparent;
        min-width: 6em;
    }
    .field:focus-visible {
        outline: none;
    }
</style>
