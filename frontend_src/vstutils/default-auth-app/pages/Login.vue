<template>
    <Oauth2ClientCredentialsGrantPageWrapper>
        <template #default="{ login, error }">
            <form @submit.prevent="() => login(username, password)">
                <p style="text-align: center">
                    {{ signInTo }} {{ $t('or') }}
                    <router-link :to="{ name: 'registration' }">{{ $t('sign up') }}</router-link
                    >.
                </p>
                <div class="form-group has-feedback">
                    <input
                        id="username"
                        v-model="username"
                        autocomplete="username"
                        autofocus
                        class="form-control"
                        maxlength="254"
                        name="username"
                        :placeholder="$t('Username').toString()"
                        required
                        type="text"
                    />
                </div>
                <div class="form-group has-feedback">
                    <input
                        id="password"
                        v-model="password"
                        autocomplete="current-password"
                        class="form-control"
                        name="password"
                        :placeholder="$t('Password').toString()"
                        type="password"
                        required
                    />
                </div>
                <div v-if="error" class="alert alert-danger" role="alert">
                    {{
                        error === 'INVALID_CREDENTIALS'
                            ? $t('Invalid username or password')
                            : $t('Error! Try again later')
                    }}
                </div>
                <button
                    class="btn btn-primary btn-block"
                    style="margin-bottom: 5px; text-transform: capitalize"
                    type="submit"
                >
                    {{ $t('sign in') }}
                </button>
                <router-link :to="{ name: 'password-reset' }" style="text-transform: capitalize">
                    {{ $t('forgot password') }}?
                </router-link>
            </form>
        </template>
        <template #second-factor="{ provideSecondFactor, error }">
            <form @submit.prevent="() => provideSecondFactor(secondFactor)">
                <FormGroup v-slot="{ id, classes }" label="Authentication code">
                    <input :id="id" v-model="secondFactor" :class="classes" type="text" inputmode="numeric" />
                </FormGroup>

                <p>
                    {{
                        $t(
                            "Enter the code from the two-factor app on your mobile device. If you've lost your device, you may enter one of your recovery codes.",
                        )
                    }}
                </p>

                <div v-if="error" class="alert alert-danger" role="alert">
                    {{ error === 'INVALID_CREDENTIALS' ? 'Invalid code' : 'Error! Try again later' }}
                </div>

                <button
                    type="submit"
                    class="btn btn-primary btn-block"
                    style="margin-bottom: 5px; text-transform: capitalize"
                >
                    {{ $t('sign in') }}
                </button>
            </form>
        </template>
    </Oauth2ClientCredentialsGrantPageWrapper>
</template>

<script lang="ts">
    import { computed, ref } from 'vue';
    import Oauth2ClientCredentialsGrantPageWrapper from './../components/Oauth2ClientCredentialsGrantPageWrapper.vue';
    import { useTranslationsManager } from './../helpers';
    import FormGroup from '../components/FormGroup.vue';

    export default {
        components: { FormGroup, Oauth2ClientCredentialsGrantPageWrapper },
        setup() {
            const { i18n } = useTranslationsManager();
            const signInTo = computed(() => {
                const msg = i18n.t('sign in to start your session') as string;
                return msg.slice(0, 1).toUpperCase() + msg.slice(1);
            });
            const username = ref('');
            const password = ref('');
            const secondFactor = ref('');
            return { username, password, secondFactor, signInTo };
        },
    };
</script>
