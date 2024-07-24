<template>
    <label :id="id" class="text-muted field-label">
        <span class="field-name">{{ label }}</span>
        <Popover v-if="description" :content="description" />
        <Popover v-if="showRequired" :content="requiredText" link-text="*" class="label-required-symbol" />
        <Popover v-if="error" link-text="!" :content="error" class="label-error-symbol" />
    </label>
</template>

<script setup lang="ts">
    import { computed } from 'vue';
    import Popover from '#vstutils/components/Popover.vue';
    import { i18n } from '#vstutils/translation';
    import type { FieldLabelPropsDefType } from './props';
    import { FieldLabelPropsDef } from './props';

    const props = defineProps(FieldLabelPropsDef as FieldLabelPropsDefType);

    const label = computed(() => {
        if (props.field.disableLabelTranslation) {
            return props.field.title;
        }
        return i18n.ts(props.field.title);
    });

    const requiredText = computed(() => i18n.ts('Required field'));
    const showRequired = computed(() => props.type === 'edit' && props.field.required);

    const error = computed(() => {
        if (typeof props.error === 'string') {
            return props.error;
        }
        return '';
    });

    const description = computed(() => {
        if (props.field.description) {
            return i18n.ts(props.field.description);
        }
        return '';
    });
</script>

<style>
    /* By default bootstrap makes all labels bold */
    .field-component .field-label:not(.form-check-label):not(.custom-file-label) {
        font-weight: normal;
    }

    .field-component .field-label {
        display: block;
        margin-bottom: 0.2rem;
    }

    .field-component .label-error-symbol {
        color: red;
        font-weight: bold;
    }

    .field-component .label-required-symbol {
        color: red;
        font-weight: bold;
    }
</style>
