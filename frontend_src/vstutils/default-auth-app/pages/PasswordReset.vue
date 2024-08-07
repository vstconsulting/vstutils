<template>
    <form v-if="state === 'INITIAL' || state === 'LOADING'" @submit.prevent="submit">
        <p>
            {{
                $t(
                    'Forgot your password? Enter your email address below, and an email with instructions for setting a new one will be sent.',
                )
            }}
        </p>
        <FormGroup v-slot="{ classes, id }" label="Email" :errors="emailErrors">
            <input :id="id" v-model="email" type="email" :class="classes" name="email" />
        </FormGroup>
        <button type="submit" class="btn btn-primary" :disabled="state === 'LOADING'">
            {{ $t('Reset my Password') }}
        </button>
        <BackButton style="margin-top: 16px" />
    </form>
    <p v-else-if="state === 'ERROR'">
        {{ $t('An error occurred. Please try again later.') }}
    </p>
    <p v-else-if="state === 'SUCCESS'">
        {{
            $t(
                "We've emailed you instructions for setting your password, if an account exists with the email you entered. You should receive them shortly.",
            )
        }}
        <br />
        {{
            $t(
                "If you don't receive an email, please make sure you've entered the address you registered with, and check your spam folder.",
            )
        }}
    </p>
</template>

<script setup lang="ts">
    import { ref } from 'vue';
    import FormGroup from './../components/FormGroup.vue';
    import { useInitAppConfig, useTranslationsManager } from '../helpers';
    import BackButton from '../components/BackButton.vue';

    const config = useInitAppConfig();
    const { i18n } = useTranslationsManager();
    const state = ref<'INITIAL' | 'LOADING' | 'ERROR' | 'SUCCESS'>('INITIAL');
    const email = ref('');
    const emailErrors = ref<string[]>([]);

    async function submit() {
        state.value = 'LOADING';
        try {
            const url = new URL('oauth2/password_reset/', config.api.url);
            url.search = new URLSearchParams({ lang: i18n.locale }).toString();
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify({ email: email.value }),
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                if (response.status === 400) {
                    const data = await response.json();
                    if (data.email) {
                        emailErrors.value = data.email;

                        state.value = 'INITIAL';
                        return;
                    }
                }
                throw new Error('Invalid response');
            }
            state.value = 'SUCCESS';
        } catch (error) {
            state.value = 'ERROR';
        }
    }
</script>
