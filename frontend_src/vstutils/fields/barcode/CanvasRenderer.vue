<template>
    <canvas ref="canvas" :class="{ rotate90 }" />
</template>

<script setup lang="ts">
    import { noop } from '@vueuse/core';
    import JsBarcode from 'jsbarcode';
    import QRCode, { type QRCodeRenderersOptions } from 'qrcode';
    import { onMounted, ref, watchPostEffect, computed } from 'vue';

    const canvas = ref<HTMLCanvasElement>();
    const rotate90 = ref(false);

    const props = defineProps<{
        type: 'qrcode' | 'barcode128';
        value: string | null | undefined;
        fullSize?: boolean;
    }>();

    const renderer = computed(() => {
        const value = props.value;
        if (!value) {
            return noop;
        }
        if (props.type == 'barcode128') {
            return () => JsBarcode(canvas.value, value, getBarcode128Options());
        } else {
            return () => QRCode.toCanvas(canvas.value, value, getQRCodeOptions());
        }
    });

    onMounted(() => {
        watchPostEffect(() => {
            if (props.value) {
                renderer.value();
            }
        });
    });

    function getQRCodeOptions(): QRCodeRenderersOptions {
        if (!props.fullSize) {
            return {};
        }
        const parentWidth = canvas.value?.parentElement?.clientWidth ?? 0;
        const parentHeight = canvas.value?.parentElement?.clientHeight ?? 0;
        return {
            width: Math.min(parentWidth, parentHeight) || undefined,
        };
    }

    function getBarcode128Options(): JsBarcode.Options {
        const moreThan10Chars = props.value && props.value.length > 10;
        const baseOptions = { fontSize: moreThan10Chars ? 13 : 16 };
        if (!props.fullSize) {
            return {
                width: moreThan10Chars ? 1 : 2,
                ...baseOptions,
            };
        }
        const parentWidth = canvas.value?.parentElement?.clientWidth ?? 0;
        const parentHeight = canvas.value?.parentElement?.clientHeight ?? 0;
        let width = parentWidth;
        let height = parentHeight;

        if (parentHeight > parentWidth) {
            rotate90.value = true;
            width = parentHeight;
            height = parentWidth;
        }

        width /= 250;
        return {
            width: moreThan10Chars ? width / 2 : width || undefined,
            height: Math.round(height / 2.5) || undefined,
            ...baseOptions,
        };
    }
</script>

<style scoped lang="scss">
    .wrapper {
        overflow: auto;

        .rotate90 {
            transform: rotate(90deg);
        }
    }
</style>
