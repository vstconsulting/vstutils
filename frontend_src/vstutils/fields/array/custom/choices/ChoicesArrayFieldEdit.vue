<template>
    <select ref="select" multiple style="width: 100%">
        <option v-for="item in items" :key="item.id" :value="item.id" :selected="value.includes(item.id)">
            {{ item.text }}
        </option>
    </select>
</template>

<script setup>
    import $ from 'jquery';
    import { ref, computed, onMounted } from 'vue';

    const props = defineProps({
        field: { type: Object, required: true },
        data: { type: Object, required: true },
        value: { type: Array, default: () => [] },
    });

    const emit = defineEmits(['set-value']);

    const select = ref(null);

    const items = computed(() => {
        return props.field.itemField.prepareEnumData();
    });

    function handleChange() {
        const value = $(select.value).select2('data');
        emit(
            'set-value',
            value.map((item) => item.id),
        );
    }

    onMounted(() => {
        $(select.value).select2({ theme: window.SELECT2_THEME }).on('change', handleChange);
    });
</script>
