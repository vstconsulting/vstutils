<template>
    <div class="form-group">
        <label :for="inputId">
            <slot name="label">
                <template v-if="label">
                    {{ $t(label) }}
                </template>
            </slot>
        </label>
        <slot :id="inputId" :classes="formControlClasses" />
        <div v-if="errors?.length" class="invalid-feedback">
            <p v-for="error in errors" :key="error">{{ $t(error) }}</p>
        </div>
    </div>
</template>

<script lang="ts">
    let lastId = 0;
</script>

<script setup lang="ts">
    import { computed } from 'vue';

    const props = defineProps<{
        label?: string;
        name?: string;
        errors?: string[];
    }>();

    const id = lastId++;
    const inputId = `form-group-${id}`;
    const formControlClasses = computed(() => {
        return ['form-control', { 'is-invalid': (props.errors?.length ?? 0) > 0 }];
    });
</script>
