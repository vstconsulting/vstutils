<template>
    <div>
        <div class="img-wrapper">
            <img
                v-if="preparedImage"
                ref="imageRef"
                :src="preparedImage"
                class="hidden modal-img"
                alt=""
                @load="initCropper"
            />
        </div>
        <div class="button-margin">
            <div class="btn-group mb-2">
                <button type="button" class="btn btn-primary button-small" @click="zoom(0.1)">
                    <span class="fa fa-search-plus" />
                </button>
                <button type="button" class="btn btn-primary btn-title button-small" disabled>
                    {{ $t('Zoom') }}
                </button>
                <button type="button" class="btn btn-primary button-small" @click="zoom(-0.1)">
                    <span class="fa fa-search-minus" />
                </button>
            </div>
            <div class="btn-group mb-2">
                <button
                    type="button"
                    class="btn btn-primary button-small"
                    :disabled="!isScale"
                    @click="scale(0.1)"
                >
                    <span class="fa fa-search-plus" />
                </button>
                <button type="button" class="btn btn-primary btn-title button-small" disabled>
                    {{ $t('Scale') }}
                </button>
                <button
                    type="button"
                    class="btn btn-primary button-small"
                    :disabled="zoomOutDisabled"
                    @click="scale(-0.1)"
                >
                    <span class="fa fa-search-minus" />
                </button>
            </div>
            <div class="btn-group mb-2">
                <button type="button" class="btn btn-primary button-small" @click="rotate(-90)">
                    <span class="fa fa-undo" />
                </button>
                <button type="button" class="btn btn-primary btn-title button-small" disabled>
                    {{ $t('Rotate') }}
                </button>
                <button type="button" class="btn btn-primary button-small" @click="rotate(90)">
                    <span class="fa fa-redo" />
                </button>
            </div>
        </div>
        <template v-if="ready">
            <p v-for="param in checkParams" :key="param" class="validator-params">
                {{ $u.capitalize($t(param)) }}: {{ paramsValues[param] }}px.
                <span v-if="!isValidSizeParam(param)" class="error">
                    {{ getErrorMessage(param) }}
                </span>
            </p>
        </template>
        <button :disabled="!isValid" class="btn btn-primary button-small" @click="crop">
            {{ $t('Crop') }}
        </button>
    </div>
</template>

<script setup lang="ts">
    import { ref, computed, reactive, onMounted } from 'vue';
    import { i18n } from '@/vstutils/translation';
    import { makeDataImageUrl, readFileAsDataUrl } from '@/vstutils/utils';
    import type { NamedFile } from '@/vstutils/fields/files/named-binary-file';
    import type ResolutionValidatorConfig from './ResolutionValidatorConfig';
    import type { IImageField } from './NamedBinaryImageField';
    import Cropper from 'cropperjs';
    import Compressor from 'compressorjs';

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
    const RESOLUTION = 4096;
    const isScale = ref(true);
    let cropper: Cropper | null = null;
    const imageRef = ref<HTMLImageElement | null>(null);
    let scaleX = 1;
    let scaleY = 1;
    const preparedImage = ref<string | null>(null);
    const zoomOutDisabled = ref(false);

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

    function getNormalizedFile(img: File) {
        return new Promise<File>((resolve, reject) => {
            new Compressor(img, {
                quality: 0.8,
                maxWidth: RESOLUTION,
                maxHeight: RESOLUTION,
                success(result) {
                    return resolve(result as File);
                },
                error(error: Error) {
                    return reject(error);
                },
            });
        });
    }

    async function namedFileToFile(namedFile: NamedFile): Promise<File> {
        const res: Response = await fetch(makeDataImageUrl(namedFile));
        const blob: Blob = await res.blob();
        return new File([blob], namedFile.name || '', { type: namedFile.mediaType! });
    }

    namedFileToFile(props.image)
        .then((file) => getNormalizedFile(file))
        .then((file) => readFileAsDataUrl(file))
        .then((dataUrl) => {
            preparedImage.value = dataUrl;
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
        const data = cropper!.getData(true);
        const canvas = cropper!.getCroppedCanvas({
            /*
             * TODO: save ratio for image
             * This hack can be a problem in some cases.
             * In the future, we need to solve this somehow differently.
             */
            width: config.width.max || data.width,
            height: config.height.max || data.height,
            maxWidth: 4096,
            maxHeight: 4096,
        });
        let img = canvas.toDataURL(props.image.mediaType || `image/${format.value}`);
        img = img.replace(/data:\w*\/?\w*;?(base64)?,/, ''); // Remove data url info (data:image/png;base64,)
        emit('crop', img);
    }
    function scale(change: number) {
        const newXScale = (scaleX || 1) + change;
        const newYScale = (scaleY || 1) + change;
        if (newXScale < 0.1 || newYScale < 0.1) {
            zoomOutDisabled.value = true;
            return;
        }
        zoomOutDisabled.value = false;
        if (change > 0) {
            const canvasData = cropper!.getCanvasData();
            if (canvasData.naturalHeight * newYScale > RESOLUTION) {
                isScale.value = false;
                return;
            }
            if (canvasData.naturalWidth * newXScale > RESOLUTION) {
                isScale.value = false;
                return;
            }
        }
        isScale.value = true;
        cropper!.scale(newXScale, newYScale);
    }
    function zoom(change: number) {
        cropper!.zoom(change);
    }
    function rotate(change: number) {
        cropper!.rotate(change);
    }
</script>

<style scoped>
    button {
        touch-action: manipulation;
        user-select: none;
        -webkit-user-select: none;
    }
    .btn-title {
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
    .button-margin {
        margin: 1rem 0;
    }
    @media (max-width: 991px) {
        .img-wrapper {
            max-height: 50vh;
        }
        .modal-img {
            aspect-ratio: 1;
        }
        .button-margin {
            margin: 0.5rem 0;
        }
        .button-small {
            padding: 0.25rem 0.5rem;
            font-size: 0.8rem;
            line-height: 1.5;
            border-radius: 0.2rem;
        }
        .validator-params {
            font-size: 14px;
            margin-bottom: 0.5rem;
        }
    }
</style>
