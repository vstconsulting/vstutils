<template>
    <ul class="tags-selector">
        <li v-for="(item, idx) in value" :key="`${idx}-${item}`" class="selected-item">
            <button
                type="button"
                tabindex="-1"
                :title="$t('Remove')"
                :aria-label="$t('Remove')"
                class="remove"
                @click="remove(idx)"
            >
                <span aria-hidden>×</span>
            </button>
            {{ item }}
        </li>
        <input
            ref="input"
            class="field"
            type="text"
            enterkeyhint="enter"
            :inputmode="inputmode"
            @keyup.enter="add($refs.input.value)"
        />
    </ul>
</template>

<script setup>
    import { ref } from 'vue';

    const props = defineProps({
        value: { type: Array, default: () => [] },
        unique: { type: Boolean, default: false },
        validator: { type: Function, default: (value) => value || undefined },
        inputmode: { type: String, default: 'text' },
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
        padding: 0 0.35rem;
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
        display: flex;
        align-items: center;
        padding: 0.35em 0.65em;
        margin-left: 0.375rem;
        font-size: 1rem;
        color: #212529;
        cursor: auto;
        border: 1px solid #ced4da;
        border-radius: 0.25rem;
    }
    .selected-item .remove {
        width: 0.75rem;
        height: 0.75rem;
        padding: 0.25em;
        margin-right: 0.25rem;
        overflow: hidden;
        text-indent: 100%;
        white-space: nowrap;
        background: transparent
            url('data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27 fill=%27%23676a6d%27%3e%3cpath d=%27M.293.293a1 1 0 011.414 0L8 6.586 14.293.293a1 1 0 111.414 1.414L9.414 8l6.293 6.293a1 1 0 01-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 01-1.414-1.414L6.586 8 .293 1.707a1 1 0 010-1.414z%27/%3e%3c/svg%3e')
            50%/0.75rem auto no-repeat;
        border: 0;
    }

    .selected-item .remove:hover {
        background: transparent
            url('data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27 fill=%27%23000%27%3e%3cpath d=%27M.293.293a1 1 0 011.414 0L8 6.586 14.293.293a1 1 0 111.414 1.414L9.414 8l6.293 6.293a1 1 0 01-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 01-1.414-1.414L6.586 8 .293 1.707a1 1 0 010-1.414z%27/%3e%3c/svg%3e')
            50%/0.75rem auto no-repeat;
    }

    .field {
        flex: 2;
        border: 0;
        margin: 0.375rem;
        color: unset;
        background-color: transparent;
        min-width: 6em;
    }

    .selected-item + .field {
        padding: 0.375rem;
    }

    .field:focus-visible {
        outline: none;
    }
</style>
