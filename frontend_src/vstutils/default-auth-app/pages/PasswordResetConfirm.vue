<template>
    <form @submit.prevent="submit">
        <p>
            {{ $t('Please enter your new password twice so we can verify you typed it in correctly.') }}
        </p>
        <FormGroup v-slot="{ classes, id }" :label="`${$t('New password')}`" :errors="passwordErrors">
            <input :id="id" v-model="password" type="password" :class="classes" name="password" />
        </FormGroup>
        <FormGroup v-slot="{ classes, id }" :label="`${$t('Confirm password')}`">
            <input
                :id="id"
                ref="password2El"
                v-model="password2"
                type="password"
                :class="classes"
                name="password2"
            />
        </FormGroup>
        <div v-if="error" class="alert alert-danger" role="alert">
            {{ $t(error) }}
        </div>
        <button type="submit" class="btn btn-primary" :disabled="isLoading">
            {{ $t('Change my Password') }}
        </button>
    </form>
</template>

<script setup lang="ts">
    import { onMounted, ref, watchEffect } from 'vue';
    import { useRoute, useRouter } from 'vue-router/composables';
    import FormGroup from './../components/FormGroup.vue';
    import { useInitAppConfig, useTranslationsManager } from '../helpers';

    const router = useRouter();
    const route = useRoute();
    const config = useInitAppConfig();
    const { i18n } = useTranslationsManager();
    const isLoading = ref(false);
    const password = ref('');
    const password2 = ref('');
    const password2El = ref<HTMLInputElement>();
    const error = ref('');
    const passwordErrors = ref<string[]>([]);

    onMounted(() => {
        watchEffect(() => {
            if (password.value !== password2.value) {
                password2El.value?.setCustomValidity(`${i18n.t('Passwords do not match.')}`);
            } else {
                password2El.value?.setCustomValidity('');
            }
        });
    });

    async function submit() {
        isLoading.value = true;
        try {
            const url = new URL('oauth2/password_reset_confirm/', config.api.url);
            url.search = new URLSearchParams({ lang: i18n.locale }).toString();
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify({
                    uid: route.params.uid,
                    token: route.params.token,
                    password: password.value,
                }),
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                const data = await response.json();
                if (data.password) {
                    passwordErrors.value = data.password;
                } else if (data.uid || data.token) {
                    error.value = 'Invalid link. Please request a new one.';
                } else {
                    throw new Error('Invalid response');
                }
                return;
            }
            router.push({ name: 'login', replace: true });
        } catch {
            error.value = 'An error occurred. Please try again later.';
        } finally {
            isLoading.value = false;
        }
    }
</script>
