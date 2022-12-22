<template>
    <div>
        <div>
            <img ref="imageRef" :src="makeDataImageUrl(image)" class="hidden modal-img" alt="" />
        </div>
        <div class="mb-3 mt-3">
            <div class="btn-group mb-2">
                <button type="button" class="btn btn-primary" @click="zoom(0.1)">
                    <span class="fa fa-search-plus" />
                </button>
                <button type="button" class="btn btn-primary btn-title" disabled>
                    {{ $t('Zoom') }}
                </button>
                <button type="button" class="btn btn-primary" @click="zoom(-0.1)">
                    <span class="fa fa-search-minus" />
                </button>
            </div>
            <div class="btn-group mb-2">
                <button type="button" class="btn btn-primary" @click="scale(0.1)">
                    <span class="fa fa-search-plus" />
                </button>
                <button type="button" class="btn btn-primary btn-title" disabled>
                    {{ $t('Scale') }}
                </button>
                <button type="button" class="btn btn-primary" @click="scale(-0.1)">
                    <span class="fa fa-search-minus" />
                </button>
            </div>
            <div class="btn-group mb-2">
                <button type="button" class="btn btn-primary" @click="rotate(-90)">
                    <span class="fa fa-undo" />
                </button>
                <button type="button" class="btn btn-primary btn-title" disabled>
                    {{ $t('Rotate') }}
                </button>
                <button type="button" class="btn btn-primary" @click="rotate(90)">
                    <span class="fa fa-redo" />
                </button>
            </div>
        </div>
        <template v-if="ready">
            <p v-for="param in checkParams" :key="param">
                {{ $u.capitalize($t(param)) }}: {{ paramsValues[param] }}px.
                <span v-if="!isValidSizeParam(param)" class="error">
                    {{ getErrorMessage(param) }}
                </span>
            </p>
        </template>
        <button :disabled="!isValid" class="btn btn-primary" @click="crop">
            {{ $t('Crop') }}
        </button>
    </div>
</template>

<script setup lang="ts">
    import { ref, computed, reactive, onMounted } from 'vue';
    import { i18n } from '@/vstutils/translation';
    import { makeDataImageUrl } from '@/vstutils/utils';
    import type { NamedFile } from '@/vstutils/fields/files/named-binary-file';
    import type ResolutionValidatorConfig from './ResolutionValidatorConfig';
    import type { IImageField } from './NamedBinaryImageField';
    import Cropper from 'cropperjs';

    const allowedExtensions = ['jpeg', 'png', 'webp'];

    const checkParams = ['width', 'height'] as const;
    type CheckParam = 'width' | 'height';

    const props = defineProps<{
        field: IImageField;
        image: NamedFile;
    }>();
    const emit = defineEmits<{
        (e: 'crop', img: string): void;
    }>();

    const ready = ref(false);
    const readyToCrop = ref(false);
    let cropper: Cropper | null = null;
    const imageRef = ref<HTMLImageElement | null>(null);
    let scaleX = 1;
    let scaleY = 1;

    const paramsValues = reactive({
        width: 0,
        height: 0,
    });

    const config = props.field.resolutionConfig as ResolutionValidatorConfig;

    const format = computed(() => {
        const imgName = props.image.name || '';
        const ext = imgName.split('.').last;
        if (allowedExtensions.includes(ext)) {
            return ext;
        }
        return 'jpeg';
    });
    const isValid = computed(() => {
        return checkParams.filter((param) => !isValidSizeParam(param)).length === 0;
    });

    onMounted(() => {
        initCropper();
    });

    function initCropper() {
        if (cropper) {
            return;
        }

        const minCroppedWidth = config.width.min;
        const minCroppedHeight = config.height.min;
        const maxCroppedWidth = config.width.max;
        const maxCroppedHeight = config.height.max;

        cropper = new Cropper(imageRef.value!, {
            viewMode: 0,
            dragMode: 'move',
            zoomable: true,
            autoCrop: false,
            ready: () => {
                ready.value = true;

                const hasMinValues = minCroppedWidth || minCroppedHeight;

                if (hasMinValues) {
                    const canvasData = cropper!.getCanvasData();
                    const ratio = canvasData.width / canvasData.naturalWidth;
                    const containerData = cropper!.getContainerData();
                    const minCroppedWidthScreen = ratio * minCroppedWidth;
                    const minCroppedHeightScreen = ratio * minCroppedHeight;

                    const zoomRatio = Math.max(
                        (minCroppedWidthScreen - containerData.width) / containerData.width,
                        (minCroppedHeightScreen - containerData.height) / containerData.height,
                    );

                    if (zoomRatio > 0) {
                        zoom(zoomRatio * -1.05);
                    }
                }

                readyToCrop.value = true;

                cropper!.crop();
            },
            zoom: (e) => {
                if (!readyToCrop.value) {
                    return;
                }
                const newRatio = e.detail.ratio;
                const canvasData = cropper!.getCanvasData();

                const newImageWidth = canvasData.naturalWidth * newRatio;
                const oldImageWidth = canvasData.width;

                const diffRatio = newImageWidth / oldImageWidth;

                if (diffRatio > 1) {
                    const cropBoxData = cropper!.getCropBoxData();
                    const newCropBoxWidth = cropBoxData.width * diffRatio;
                    const newCropBoxHeight = cropBoxData.height * diffRatio;

                    if (
                        // @ts-expect-error Property 'cropper' does not exist in Cropper
                        newCropBoxWidth > cropper!.cropper.clientWidth ||
                        // @ts-expect-error Property 'cropper' does not exist in Cropper
                        newCropBoxHeight > cropper!.cropper.clientHeight
                    ) {
                        e.preventDefault();
                    }
                }
            },
            crop: (event) => {
                if (!readyToCrop.value) {
                    return;
                }
                scaleX = event.detail.scaleX;
                scaleY = event.detail.scaleY;

                const width = Math.round(event.detail.width);
                const height = Math.round(event.detail.height);

                paramsValues.width = width;
                paramsValues.height = height;

                if (
                    width < minCroppedWidth ||
                    height < minCroppedHeight ||
                    width > maxCroppedWidth ||
                    height > maxCroppedHeight
                ) {
                    cropper!.setData({
                        width: Math.round(Math.max(minCroppedWidth, Math.min(maxCroppedWidth, width))),
                        height: Math.round(Math.max(minCroppedHeight, Math.min(maxCroppedHeight, height))),
                    });
                }
            },
        });
    }
    function isValidSizeParam(param: CheckParam) {
        return config[param].min <= paramsValues[param] && paramsValues[param] <= config[param].max;
    }
    function getErrorMessage(param: CheckParam) {
        if (param === 'height' || param === 'width') {
            return i18n.t('imageValidationResolutionError', {
                min: config[param].min,
                max: config[param].max,
            });
        }
        return;
    }
    function crop() {
        let img = cropper!.getCroppedCanvas().toDataURL(props.image.mediaType || `image/${format.value}`);
        img = img.replace(/data:\w*\/?\w*;?(base64)?,/, ''); // Remove data url info (data:image/png;base64,)
        emit('crop', img);
    }
    function scale(change: number) {
        cropper!.scale((scaleX || 1) + change, (scaleY || 1) + change);
    }
    function zoom(change: number) {
        cropper!.zoom(change);
    }
    function rotate(change: number) {
        cropper!.rotate(change);
    }
</script>

<style scoped>
    .validator-modal .btn-title {
        cursor: default;
    }
    .error {
        color: red;
    }
    .hidden {
        opacity: 0;
    }
    .modal-img {
        height: auto;
        max-width: 100%;
        aspect-ratio: 3/2;
    }
    @media (max-width: 991px) {
        .modal-img {
            aspect-ratio: 1;
        }
    }
</style>
