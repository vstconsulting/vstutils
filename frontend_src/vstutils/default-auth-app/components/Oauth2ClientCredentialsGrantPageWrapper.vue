<template>
    <div>
        <slot
            v-if="secondFactorRequired"
            name="second-factor"
            :provide-second-factor="provideSecondFactor"
            :is-loading="isLoading"
            :error="error"
        />
        <slot v-else :login="login" :is-loading="isLoading" :error="error" />
    </div>
</template>

<script lang="ts">
    import { ref } from 'vue';
    import { ErrorResponse } from 'oidc-client-ts';
    import { useOauth2UserManager, useMainAppOpener } from './../helpers';

    export default {
        setup() {
            const isLoading = ref(false);
            const secondFactorRequired = ref(false);
            const userManager = useOauth2UserManager();
            const openMainApp = useMainAppOpener();
            const error = ref<'INVALID_CREDENTIALS' | 'OTHER_ERROR'>();

            async function _loginWithSecondFactor(username: string, password: string, secondFactor?: string) {
                try {
                    // @ts-expect-error Its actually writable
                    userManager.settings.extraTokenParams = { second_factor: secondFactor };
                    return await userManager.signinResourceOwnerCredentials({
                        username,
                        password,
                    });
                } finally {
                    // @ts-expect-error Its actually writable
                    userManager.settings.extraTokenParams = {};
                }
            }

            let usernameForSecondFactor = '';
            let passwordForSecondFactor = '';

            async function _login(username: string, password: string, secondFactor?: string) {
                isLoading.value = true;
                error.value = undefined;
                try {
                    await _loginWithSecondFactor(username, password, secondFactor);
                    openMainApp();
                } catch (e) {
                    if (e instanceof ErrorResponse && e.error === 'invalid_request') {
                        if (e.error_description === 'Missing or invalid "second_factor" in request.') {
                            if (secondFactorRequired.value) {
                                error.value = 'INVALID_CREDENTIALS';
                                return;
                            } else {
                                secondFactorRequired.value = true;
                                usernameForSecondFactor = username;
                                passwordForSecondFactor = password;
                                return;
                            }
                        }
                        error.value = 'INVALID_CREDENTIALS';
                        return;
                    }
                    console.error(e);
                    error.value = 'OTHER_ERROR';
                } finally {
                    isLoading.value = false;
                }
            }

            function login(username: string, password: string) {
                return _login(username, password);
            }

            function provideSecondFactor(secondFactor?: string) {
                return _login(usernameForSecondFactor, passwordForSecondFactor, secondFactor);
            }

            return { login, provideSecondFactor, secondFactorRequired, isLoading, error };
        },
    };
</script>
