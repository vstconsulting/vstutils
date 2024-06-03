<template>
    <div v-if="emailConfirmationRequired" style="gap: 10px; display: flex; flex-direction: column">
        {{ $t('You have successfully registered. Please check your email for a confirmation link.') }}
        <router-link
            :to="{ name: 'login' }"
            style="text-transform: capitalize"
            class="btn btn-primary btn-block"
            >{{ $t('login') }}</router-link
        >
    </div>
    <form v-else ref="formEl" @submit.prevent="register">
        <FormGroup v-slot="{ classes, id }" label="Username" :errors="errors.username">
            <input
                :id="id"
                autocomplete="username"
                autofocus
                :class="classes"
                name="username"
                required
                type="text"
            />
        </FormGroup>
        <FormGroup v-slot="{ classes, id }" label="Email" :errors="errors.email">
            <input :id="id" autocomplete="email" :class="classes" name="email" required type="text" />
        </FormGroup>
        <FormGroup v-slot="{ classes, id }" label="Password" :errors="errors.password">
            <input
                :id="id"
                v-model="password1"
                autocomplete="new-password"
                :class="classes"
                name="password"
                required
                type="password"
            />
        </FormGroup>
        <FormGroup v-slot="{ classes, id }" label="Repeat password" :errors="errors.password2">
            <input
                :id="id"
                ref="password2El"
                v-model="password2"
                autocomplete="new-password"
                :class="classes"
                name="password2"
                type="password"
                required
            />
        </FormGroup>
        <div v-for="(error, idx) in nonFieldsErrors" :key="idx" class="alert alert-danger" role="alert">
            {{ $t(error) }}
        </div>
        <button class="btn btn-primary btn-block" style="text-transform: capitalize">
            {{ $t('register') }}
        </button>
        <BackButton />
    </form>
</template>

<script setup lang="ts">
    import { onMounted, ref, watchEffect } from 'vue';
    import { useRouter } from 'vue-router/composables';
    import { useInitAppConfig, useTranslationsManager } from './../helpers';
    import FormGroup from './../components/FormGroup.vue';
    import BackButton from './../components/BackButton.vue';

    const router = useRouter();
    const { i18n } = useTranslationsManager();
    const config = useInitAppConfig();
    const formEl = ref<HTMLFormElement>();
    const password2El = ref<HTMLInputElement>();
    const password1 = ref('');
    const password2 = ref('');
    const errors = ref<Record<string, string[]>>({});
    const nonFieldsErrors = ref<string[]>([]);
    const emailConfirmationRequired = ref(false);

    onMounted(() => {
        watchEffect(() => {
            password2El.value?.setCustomValidity(
                password1.value !== password2.value ? (i18n.t('Passwords do not match.') as string) : '',
            );
        });
    });

    async function register() {
        const form = formEl.value;
        if (!form) {
            return;
        }
        try {
            const url = new URL(`oauth2/registration/`, config.api.url);
            url.search = new URLSearchParams({ lang: i18n.locale }).toString();
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            errors.value = {};
            nonFieldsErrors.value = [];
            if (response.ok) {
                if (data.email_confirmation_required) {
                    emailConfirmationRequired.value = true;
                } else {
                    router.push({ name: 'login' });
                }
            } else {
                if (response.status === 400) {
                    errors.value = data;
                    if (data.detail) {
                        nonFieldsErrors.value = [data.detail];
                    }
                } else {
                    nonFieldsErrors.value = ['An error occurred. Please try again later.'];
                }
            }
        } catch (error) {
            errors.value = {};
            nonFieldsErrors.value = ['An error occurred. Please try again later.'];
        }
    }
</script>
