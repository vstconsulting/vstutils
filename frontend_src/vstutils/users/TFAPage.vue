<template>
    <EntityView
        :breadcrumbs="null"
        :error="error"
        :loading="loading"
        :response="response"
        :title="title"
        :view="view"
        :actions="actions"
        :sublinks="sublinks"
        :show-back-button="showBackButton"
        @execute-action="executeAction($event, instance)"
        @open-sublink="openSublink($event, instance)"
    >
        <template v-if="!isEnabled">
            <p>
                <!-- eslint-disable-next-line prettier/prettier -->
                {{ $t('Scan the image with the two-factor authentication app on your phone. If you can’t use a barcode, enter this text code instead.') }}
            </p>
            <div class="qr-code-container">
                <img :src="qrcode" />
            </div>
            <p>
                {{ $t('code') | capitalize }}:
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
                        {{ $t('recovery codes') | capitalize }}
                    </h3>
                    <div class="card-tools">
                        <button class="btn btn-secondary" @click="copyRecoveryCodes">
                            {{ $t('copy') | capitalize }}
                        </button>
                    </div>
                </div>
                <div ref="recoveryCodes" class="card-body">
                    <code v-for="code in recoveryCodes" class="col-3">{{ code }}</code>
                </div>
            </div>
        </template>
        <p v-else>
            {{ $t("Disabling Two-Factor Authentication (2FA) will decrease your account's security") }}
        </p>
    </EntityView>
</template>

<script>
    import QRCode from 'qrcode';
    import { PageEditViewComponent } from '../components/page';
    import { guiPopUp, pop_up_msg } from '../popUp';
    import { copyToClipboard, generateBase32String, generateRandomString } from '../utils';

    const RECOVERY_CODE_LENGTH = 10;

    export default {
        name: 'TFAPage',
        mixins: [PageEditViewComponent],
        data: () => ({ qrcode: '' }),
        computed: {
            isEnabled() {
                return this.instance?.enabled;
            },
            actions() {
                return [{ name: 'save', title: this.isEnabled ? 'Disable' : 'Enable' }];
            },
            title() {
                return this.$t('Two factor authentication');
            },
            pinField() {
                return this.model.fields.get('pin');
            },
            secret() {
                return this.sandbox.secret;
            },
            recoveryCodes() {
                return (this.sandbox?.recovery || '').split(',');
            },
        },
        methods: {
            async fetchData() {
                this.initLoading();
                try {
                    await this.dispatchAction('fetchData', this.getInstancePk());
                    if (!this.isEnabled) {
                        this.commitMutation('setFieldValue', {
                            field: 'secret',
                            value: generateBase32String(),
                        });

                        const codes = [];
                        const half = Math.ceil(RECOVERY_CODE_LENGTH / 2);
                        for (let i = 0; i < 15; i++) {
                            const code = generateRandomString(RECOVERY_CODE_LENGTH).toLowerCase();
                            codes.push(code.slice(0, half) + '-' + code.slice(half));
                        }
                        this.commitMutation('setFieldValue', { field: 'recovery', value: codes.join(',') });

                        this.qrcode = await QRCode.toDataURL(this.secret, { scale: 6 });
                    }
                    this.setLoadingSuccessful();
                } catch (error) {
                    this.setLoadingError(error);
                }
            },
            async saveInstance() {
                try {
                    this.commitMutation('validateAndSetInstanceData');
                } catch (e) {
                    window.app.error_handler.defineErrorAndShow(e);
                    return;
                }
                this.loading = true;
                const instance = this.instance;
                const name = instance.getViewFieldString() || instance.getPkValue() || '';
                try {
                    await instance.update('put');
                    await this.fetchData();
                    this.loading = false;
                    this.isPageChanged = false;
                    guiPopUp.success(
                        this.$t(pop_up_msg.instance.success.save).format([name, this.view.name]),
                    );
                    this.openPage({ path: this.getRedirectUrl({ instance }) });
                } catch (error) {
                    this.loading = false;
                    let str = window.app.error_handler.errorToString(error);

                    let srt_to_show = this.$t(pop_up_msg.instance.error.save).format([
                        name,
                        this.$t(this.view.name),
                        str,
                    ]);

                    window.app.error_handler.showError(srt_to_show, str);
                }
            },
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
        width: 200px;
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
