<template>
    <div v-if="type === 'edit'" class="input-group mb-3">
        <input v-model="newKey" class="form-control" :placeholder="$ts('Key')" />
        <div class="input-group-append">
            <button type="button" class="btn btn-success" @click="addKey">
                <i class="fas fa-plus" />
                {{ $t('Add') }}
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
    import { ref } from 'vue';

    defineProps(FieldLabelPropsDef as FieldLabelPropsDefType);
    const emit = defineEmits(FieldLabelEmitsDef as FieldLabelEmitsDefType);

    const newKey = ref('');

    function addKey() {
        if (newKey.value) {
            emit('add-key', newKey.value);
            newKey.value = '';
        }
    }
</script>
