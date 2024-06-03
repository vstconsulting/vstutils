<template>
    <button class="btn btn-secondary btn-block" type="button" @click="() => router.back()">
        {{ i18n.t('Go back') }}
    </button>
</template>

<script setup lang="ts">
    import { useRouter } from 'vue-router/composables';
    import { useTranslationsManager } from './../helpers';

    const { i18n } = useTranslationsManager();
    const router = useRouter();
</script>
