<template>
    <div style="aspect-ratio: 1; display: flex; justify-content: center; align-items: center">
        <p v-if="error" style="text-align: center">
            {{ $t(error) }}
        </p>
        <Spinner v-else />
    </div>
</template>

<script setup lang="ts">
    import { ref } from 'vue';
    import { useRoute, useRouter } from 'vue-router/composables';
    import { useTranslationsManager, useInitAppConfig } from './../helpers';
    import Spinner from '@/vstutils/components/Spinner.vue';

    const router = useRouter();
    const route = useRoute();
    const translationsManager = useTranslationsManager();
    const config = useInitAppConfig();
    const code = route.params.code;
    const error = ref('');

    (async () => {
        try {
            const url = new URL('oauth2/confirm_email/', config.api.url);
            url.search = new URLSearchParams({ lang: translationsManager.i18n.locale }).toString();
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify({ code }),
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                if (response.status === 400) {
                    error.value = 'Confirmation link is invalid or expired.';
                } else {
                    error.value = 'An error occurred. Please try again later.';
                }
                return;
            }
            router.push({ name: 'login' });
        } catch (e) {
            error.value = 'An error occurred. Please try again later.';
        }
    })();
</script>
