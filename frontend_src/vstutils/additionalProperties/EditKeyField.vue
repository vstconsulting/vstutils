<template>
    <div v-if="type === 'edit'" class="input-group mb-3">
        <input class="form-control" :placeholder="$ts('Key')" :value="field.name" @blur="replaceKey" />
        <div class="input-group-append">
            <button type="button" class="btn btn-danger" @click="deleteKey">
                <i class="fas fa-minus" />
                {{ $t('Remove') }}
            </button>
        </div>
    </div>
    <BaseFieldLabel v-else :id="id" :field="field" :value="value" :type="type" :data="data" :error="error" />
</template>

<script setup lang="ts">
    import type { FieldLabelEmitsDefType, FieldLabelPropsDefType } from '#vstutils/fields/base';
    import { FieldLabelEmitsDef } from '#vstutils/fields/base';
    import { BaseFieldLabel } from '#vstutils/fields/base';
    import { FieldLabelPropsDef } from '#vstutils/fields/base';

    const props = defineProps(FieldLabelPropsDef as FieldLabelPropsDefType);
    const emit = defineEmits(FieldLabelEmitsDef as FieldLabelEmitsDefType);

    function replaceKey(e: FocusEvent) {
        emit('replace-key', {
            oldKey: props.field.name,
            newKey: (e.currentTarget as HTMLInputElement).value,
        });
    }

    function deleteKey() {
        emit('delete-key', props.field.name);
    }
</script>
