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
            {{ $u.capitalize($ts('code')) }}:
            <code>{{ secret }}</code>
        </p>
        <component
            :is="pinField.component"
            :key="pinField.name"
            :field="pinField"
            :data="store.sandbox"
            type="edit"
            style="max-width: 340px; margin: 0 auto"
            @set-value="store.setFieldValue"
        />
        <hr />
        <p>
            <!-- eslint-disable-next-line prettier/prettier -->
            {{ $t('Recovery codes are used to access your account in the event you cannot receive two-factor authentication codes.') }}
        </p>
        <div class="card recovery-codes">
            <div class="card-header">
                <h3 class="card-title">
                    {{ $u.capitalize($ts('recovery codes')) }}
                </h3>
                <div class="card-tools">
                    <button class="btn btn-secondary" @click="copyRecoveryCodes">
                        {{ $u.capitalize($ts('copy')) }}
                    </button>
                </div>
            </div>
            <div ref="recoveryCodesEl" class="card-body">
                <code v-for="code in recoveryCodes" :key="code" class="col-3">{{ code }}</code>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import QRCode from 'qrcode';
    import { computed, ref, toRef, watch } from 'vue';
    import { useViewStore } from '@/vstutils/store';
    import { copyToClipboard } from '@/vstutils/utils';
    import { ViewPropsDef } from '@/vstutils/views';

    import type { PageEditView, ViewPropsDefType } from '@/vstutils/views';

    const props = defineProps(ViewPropsDef as ViewPropsDefType<PageEditView>);

    const store = useViewStore(props.view);

    const qrcode = ref('');

    const isEnabled = computed(() => {
        return store.sandbox.enabled;
    });
    const pinField = computed(() => {
        return store.model.fields.get('pin');
    });
    const secret = computed(() => {
        return store.sandbox.secret;
    });
    const recoveryCodes = computed(() => {
        return ((store.sandbox?.recovery as string | undefined) || '').split(',');
    });

    watch(toRef(store, 'secretUri'), async (value) => {
        if (value) {
            qrcode.value = await QRCode.toDataURL(value, { scale: 6 });
        }
    });

    const recoveryCodesEl = ref<HTMLElement>();

    function copyRecoveryCodes() {
        copyToClipboard(recoveryCodesEl.value!.innerText);
    }
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
