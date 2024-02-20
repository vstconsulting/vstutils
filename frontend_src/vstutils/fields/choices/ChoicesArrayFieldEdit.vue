<template>
    <select ref="select" multiple style="width: 100%" />
</template>

<script setup lang="ts">
    import { type PropType, ref, computed, onMounted, toRef, watch } from 'vue';
    import type { ChoicesField } from '@/vstutils/fields/choices';
    import { useSelect2 } from '@/vstutils/select2';
    import { deepEqual } from '@/vstutils/utils';
    import type { ArrayField } from '@/vstutils/fields/array';

    const props = defineProps({
        field: { type: Object as PropType<ArrayField<ChoicesField>>, required: true },
        data: { type: Object, required: true },
        value: { type: Array, default: () => [] },
    });

    const emit = defineEmits(['set-value']);

    const select = ref(null);

    const items = computed(() => {
        return props.field.itemField!.prepareEnumData();
    });

    const { init, setValue } = useSelect2(select, (data) => {
        const newValue = data.map((item) => item.id);
        if (!deepEqual(newValue, props.value)) {
            emit('set-value', newValue);
        }
    });

    watch(toRef(props, 'value'), (value) => {
        setValue(value);
    });

    onMounted(() => {
        init({ data: items.value });
        setValue(props.value);
    });
</script>
