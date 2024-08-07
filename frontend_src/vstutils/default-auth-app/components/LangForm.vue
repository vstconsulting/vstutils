<template>
    <form class="lang-form" method="get">
        <select v-model="currentLang" class="custom-select" name="lang">
            <option
                v-for="{ code, name } in translationsManager.availableLanguages"
                :key="code"
                :value="code"
            >
                {{ name }}
            </option>
        </select>
    </form>
</template>

<script setup lang="ts">
    import { ref, watch } from 'vue';
    import { useTranslationsManager } from './../helpers';

    const translationsManager = useTranslationsManager();

    const currentLang = ref(translationsManager.i18n.locale);

    watch(currentLang, (newLang) => {
        translationsManager.setLanguage(newLang);
    });
</script>

<style scoped>
    .lang-form {
        width: 120px;
        top: 10px;
        right: 10px;
        position: absolute;
    }
</style>
