<template>
    <p v-if="isEnabled">
        {{ $t("Disabling Two-Factor Authentication (2FA) will decrease your account's security") }}
    </p>
    <div v-else>
        <p>
            <!-- eslint-disable-next-line prettier/prettier -->
            {{ $t('Scan the image with the two-factor authentication app on your phone. If you can’t use a QR code, enter this text code instead.') }}
        </p>
        <div class="qr-code-container">
            <img :src="qrcode" />
        </div>
        <p>
            {{ $u.capitalize($t('code')) }}:
            <code>{{ secret }}</code>
        </p>
        <component
            :is="pinField.component"
            :key="pinField.name"
            :field="pinField"
            :data="data"
            type="edit"
            style="max-width: 340px; margin: 0 auto"
            @set-value="setFieldValue"
        />
        <hr />
        <p>
            <!-- eslint-disable-next-line prettier/prettier -->
            {{ $t('Recovery codes are used to access your account in the event you cannot receive two-factor authentication codes.') }}
        </p>
        <div class="card recovery-codes">
            <div class="card-header">
                <h3 class="card-title">
                    {{ $u.capitalize($t('recovery codes')) }}
                </h3>
                <div class="card-tools">
                    <button class="btn btn-secondary" @click="copyRecoveryCodes">
                        {{ $u.capitalize($t('copy')) }}
                    </button>
                </div>
            </div>
            <div ref="recoveryCodes" class="card-body">
                <code v-for="code in recoveryCodes" :key="code" class="col-3">{{ code }}</code>
            </div>
        </div>
    </div>
</template>

<script>
    import QRCode from 'qrcode';
    import OneEntity from '../components/page/OneEntity.vue';
    import { copyToClipboard } from '../utils';

    export default {
        name: 'TFAPage',
        mixins: [OneEntity],
        data() {
            return {
                qrcode: '',
            };
        },
        computed: {
            isEnabled() {
                return this.instance?.enabled;
            },
            pinField() {
                return this.model.fields.get('pin');
            },
            secret() {
                return this.store.sandbox.secret;
            },
            recoveryCodes() {
                return (this.store.sandbox?.recovery || '').split(',');
            },
        },
        watch: {
            async 'store.secretUri'(value) {
                if (value) {
                    this.qrcode = await QRCode.toDataURL(value, { scale: 6 });
                }
            },
        },
        methods: {
            copyRecoveryCodes() {
                copyToClipboard(this.$refs.recoveryCodes.innerText);
            },
        },
    };
</script>

<style scoped>
    p {
        text-align: center;
    }
    .qr-code-container {
        margin: 0 auto;
        width: 270px;
    }
    .qr-code-container img {
        width: 100%;
    }
    .recovery-codes {
        max-width: 533px;
        margin: 0 auto;
    }
    .recovery-codes .card-body {
        display: flex;
        flex-wrap: wrap;
    }
    .recovery-codes .card-body code {
        display: block;
        margin-left: 15px;
    }
</style>
