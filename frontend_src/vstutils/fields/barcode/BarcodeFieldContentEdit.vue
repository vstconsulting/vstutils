<template>
    <div class="wrapper">
        <div class="input-group" :class="{ 'mb-2': isScanning }">
            <div class="input-group-prepend" :class="{ 'is-editing': isEditing }">
                <button
                    :title="$ts('Toggle camera')"
                    class="btn input-group-text"
                    type="button"
                    :disabled="!camera || (isScanning && !scannerIsInitialized)"
                    @click="toggleScanning"
                >
                    <i class="fa fa-camera" aria-hidden="true" />
                </button>

                <button
                    v-if="!field.props.hideManualEditing"
                    :title="$ts('Edit manually')"
                    type="button"
                    class="btn input-group-text"
                    @click="toggleManualEdit"
                >
                    <i class="fas fa-pencil-alt" aria-hidden="true" />
                </button>
            </div>
            <template v-if="isEditing">
                <input type="text" class="form-control" :value="value" @input="setValueFromInput" />
                <div class="input-group-append">
                    <button
                        :title="$ts('Clear field')"
                        class="btn input-group-text"
                        type="button"
                        @click="clearValue"
                    >
                        <i class="fa fa-times" aria-hidden="true" />
                    </button>
                </div>
            </template>
        </div>

        <div v-if="!camera" class="no-camera mt-1">
            <button type="button" @click="openSidebar">
                <span>{{ $ts('Select scanner camera at sidebar') }}</span>
                <i class="fas fa-external-link-alt" aria-hidden="true" />
            </button>
        </div>

        <ScannerCamera
            v-if="isScanning && camera"
            ref="scannerCameraEl"
            :camera-id="camera.deviceId"
            :formats-to-support="field.formatsToSupport"
            :box-aspect-ratio="field.boxAspectRatio"
            :box-offset="field.boxOffset"
            class="scanner-camera"
            @scan="emit('set-value', $event)"
            @initialized="scannerIsInitialized = true"
        />
    </div>
</template>

<script setup lang="ts">
    import { ref, computed, defineAsyncComponent } from 'vue';
    import { getApp } from '#vstutils/utils';
    import type { FieldEditPropsDefType } from '#vstutils/fields/base';
    import { FieldEditPropsDef } from '#vstutils/fields/base';
    import type { BarcodeField } from './base';
    import { useWidthResizeObserver } from '#vstutils/composables';

    const ScannerCamera = defineAsyncComponent(() => import('./ScannerCamera.vue'));

    const emit = defineEmits<{
        (e: 'set-value', value: string | null | undefined): void;
    }>();

    const props = defineProps(FieldEditPropsDef as FieldEditPropsDefType<BarcodeField>);

    const app = getApp();
    const scanImmediately = !!props.field.props.scanImmediately;

    const isScanning = ref(scanImmediately);
    const scannerIsInitialized = ref(false);
    const isEditing = ref(false);
    const scannerCameraEl = ref<InstanceType<typeof import('./ScannerCamera.vue').default>>();

    const camera = computed(
        () => app.localSettingsStore.settings.scannerCamera as MediaDeviceInfo | undefined,
    );

    function startScanning() {
        isScanning.value = true;
    }

    function stopScanning() {
        isScanning.value = false;
        scannerIsInitialized.value = false;
    }

    function toggleScanning() {
        isScanning.value ? stopScanning() : startScanning();
    }

    function toggleManualEdit() {
        isEditing.value = !isEditing.value;
    }

    function clearValue() {
        emit('set-value', props.field.getEmptyValue());
    }

    function openSidebar(e: Event) {
        e.stopPropagation();

        app.rootVm.openControlSidebar();
    }

    function setValueFromInput(e: Event) {
        emit('set-value', (e.target as HTMLInputElement).value);
    }

    // @ts-expect-error for some reason event types are incompatible, it's safe to ignore
    useWidthResizeObserver(scannerCameraEl, () => {
        if (isScanning.value && scannerIsInitialized.value) {
            stopScanning();
        }
    });
</script>

<style scoped lang="scss">
    .wrapper {
        position: relative;

        .input-group-prepend {
            min-height: 2.375rem;

            &:not(.is-editing) {
                :last-child {
                    border-top-right-radius: 4px;
                    border-bottom-right-radius: 4px;
                }
            }
        }

        .input-group-append {
            z-index: 2;
        }

        .no-camera {
            button {
                display: contents;
                font-size: 1rem;
                color: red;
            }
        }

        .scanner-camera {
            width: 100%;
            max-width: 48rem;
        }
    }
</style>
