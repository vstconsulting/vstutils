<template>
    <form @submit.prevent="check">
        <div class="input-group">
            <input v-model="value" class="form-control" v-bind="attrs" type="text" />
            <div class="input-group-append">
                <button
                    type="submit"
                    class="btn input-group-text"
                    :disabled="!!errorText"
                    :title="$ts('Save')"
                >
                    <i class="fas fa-save" />
                </button>
            </div>
        </div>
        <small v-if="errorText" class="form-text" style="display: flex; justify-content: space-between">
            <span style="color: var(--danger)">{{ errorText }}</span>
            <span>{{ value.length }}</span>
        </small>
    </form>
</template>

<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { i18n } from '#vstutils/translation';
    import type { InputHTMLAttributes } from 'vue/types/jsx';

    const props = defineProps<{
        file: File;
        maxLength: number;
        minLength: number;
    }>();

    const emit = defineEmits<{
        (e: 'done', file: File): void;
    }>();

    const value = ref(props.file.name);

    const attrs = computed(() => {
        const obj: InputHTMLAttributes = {};

        if (Number.isFinite(props.minLength)) {
            obj.minlength = props.minLength;
        }
        if (Number.isFinite(props.maxLength)) {
            obj.maxlength = props.maxLength;
        }

        return obj;
    });

    const errorText = computed(() => {
        return value.value.length < props.minLength
            ? i18n.t('Min length: {0}', [props.minLength])
            : value.value.length > props.maxLength
            ? i18n.t('Max length: {0}', [props.maxLength])
            : '';
    });

    function check() {
        if (!errorText.value) {
            emit('done', new File([props.file], value.value, { type: props.file.type }));
        }
    }
</script>
