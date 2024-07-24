<template>
    <Card>
        <form @submit.prevent="check">
            <div v-for="(file, idx) in filesData" :key="idx" class="form-group">
                <input
                    class="form-control"
                    :data-idx="idx"
                    :maxlength="maxLength"
                    :minlength="minLength"
                    :value="file.value"
                    @input="handleInput"
                />
                <small v-if="file.errorText" class="form-text info">
                    <span style="color: var(--danger)">{{ file.errorText }}</span>
                    <span>{{ file.value.length }}</span>
                </small>
            </div>

            <button type="submit" class="btn btn-default" :disabled="!ready">{{ $t('Save') }}</button>
            <button type="button" class="btn btn-default" @click="emit('cancel')">{{ $t('Cancel') }}</button>
        </form>
    </Card>
</template>

<script setup lang="ts">
    import { computed, ref, set } from 'vue';
    import { i18n } from '#vstutils/translation';
    import Card from '#vstutils/components/Card.vue';

    const props = defineProps<{
        files: File[];
        maxLength: number;
        minLength: number;
    }>();

    const emit = defineEmits<{
        (e: 'done', files: File[]): void;
        (e: 'cancel'): void;
    }>();

    const values = ref<string[]>(props.files.map((file) => file.name));

    const filesData = computed(() => {
        return props.files.map((file, idx) => {
            const value = values.value[idx];
            const errorText =
                value.length < props.minLength
                    ? i18n.t('Minimum filename length: {0}', [props.minLength])
                    : value.length > props.maxLength
                    ? i18n.t('Maximum filename length: {0}', [props.maxLength])
                    : '';

            return {
                value,
                errorText,
            };
        });
    });

    const ready = computed(() => {
        return filesData.value.every((file) => !file.errorText);
    });

    function handleInput(e: Event) {
        const target = e.target as HTMLInputElement;
        const idx = Number.parseInt(target.dataset['idx']!);
        set(values.value, idx, target.value);
    }

    function check() {
        emit(
            'done',
            props.files.map((file, idx) => new File([file], values.value[idx], { type: file.type })),
        );
    }
</script>

<style scoped>
    .info {
        display: flex;
        justify-content: space-between;
    }
</style>
