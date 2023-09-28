<template>
    <div :id="id" />
</template>

<script setup lang="ts">
    import { onMounted, onBeforeUnmount } from 'vue';
    import { fitToWrapper, getUniqueId } from '@/vstutils/utils';
    import type { Html5QrcodeSupportedFormats } from 'html5-qrcode';
    import { Html5Qrcode } from 'html5-qrcode';
    import { useTimeoutFn } from '@vueuse/core';

    const props = withDefaults(
        defineProps<{
            cameraId: string;
            formatsToSupport: Html5QrcodeSupportedFormats[];
            boxOffset?: number;
            boxAspectRatio?: number;
            throttleScanMs?: number;
        }>(),
        {
            boxOffset: 0.33,
            boxAspectRatio: 1,
            throttleScanMs: 5000,
        },
    );

    const emit = defineEmits<{
        (e: 'scan', value: string): void;
        (e: 'initialized'): void;
    }>();

    const id = `scanner-${getUniqueId()}`;
    let scanner: Html5Qrcode | undefined = undefined;

    let prevScan: string | undefined;
    const prevScanResetTimeout = useTimeoutFn(() => (prevScan = undefined), props.throttleScanMs);

    function onScanSuccess(decodedText: string) {
        if (decodedText !== prevScan) {
            emit('scan', decodedText);
            prevScan = decodedText;
            prevScanResetTimeout.start();
        }
    }

    onMounted(async () => {
        scanner = new Html5Qrcode(id, {
            formatsToSupport: props.formatsToSupport,
            verbose: false,
        });
        await scanner.start(
            props.cameraId,
            {
                fps: 10,
                qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                    return fitToWrapper({
                        wrapperWidth: viewfinderWidth,
                        wrapperHeight: viewfinderHeight,
                        aspectRatio: props.boxAspectRatio,
                        padding: props.boxOffset,
                    });
                },
            },
            onScanSuccess,
            undefined,
        );
        emit('initialized');
    });

    onBeforeUnmount(async () => {
        if (scanner && scanner.isScanning) {
            await scanner.stop();
            scanner.clear();
        }
    });
</script>
