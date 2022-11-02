<template>
    <BootstrapModal ref="modal" classes="modal-lg" @exit="$emit('cancel')" @shown="onLoad">
        <template #body>
            <div>
                <img ref="image" :src="makeDataImageUrl(image)" class="hidden modal-img" alt="" />
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
                    {{ $u.capitalize($t(param)) }}: {{ $data[param] }}px.
                    <span v-if="!isValidSizeParam(param)" class="error">
                        {{ getErrorMessage(param) }}
                    </span>
                </p>
            </template>
        </template>
        <template #footer>
            <button :disabled="!isValid" class="btn btn-primary" @click="crop">
                {{ $t('Crop') }}
            </button>
        </template>
    </BootstrapModal>
</template>

<script>
    import Cropper from 'cropperjs/dist/cropper.js';
    import BootstrapModal from '../../../components/BootstrapModal.vue';
    import { makeDataImageUrl } from '../../../utils';

    const allowedExtensions = ['jpeg', 'png', 'webp'];

    export default {
        name: 'ImageResolutionValidatorModal',
        components: { BootstrapModal },
        props: {
            field: { type: Object, required: true },
            images: { type: Array, required: true },
        },
        data() {
            return {
                makeDataImageUrl,
                width: 0,
                height: 0,
                currentImageIdx: 0,
                resized: [],
                checkParams: ['width', 'height'],
                ready: false,
            };
        },
        computed: {
            config() {
                return this.field.resolutionConfig;
            },
            image() {
                return this.images[this.currentImageIdx];
            },
            format() {
                const imgName = this.image.name || '';
                const ext = imgName.split('.').last;
                if (allowedExtensions.includes(ext)) {
                    return ext;
                }
                return 'jpeg';
            },
            isValid() {
                return this.checkParams.filter((param) => !this.isValidSizeParam(param)).length === 0;
            },
        },
        watch: {
            image() {
                this.cropper.replace(makeDataImageUrl(this.image));
            },
        },
        mounted() {
            this.$refs.modal.open();
        },
        beforeDestroy() {
            this.cropper.destroy();
        },
        methods: {
            onLoad() {
                this.initCropper();
            },
            initCropper() {
                if (this.cropper) {
                    return;
                }

                const minCroppedWidth = this.config.width.min;
                const minCroppedHeight = this.config.height.min;
                const maxCroppedWidth = this.config.width.max;
                const maxCroppedHeight = this.config.height.max;

                this.cropper = new Cropper(this.$refs.image, {
                    dragMode: 'move',
                    data: {
                        width: (minCroppedWidth + maxCroppedWidth) / 2,
                        height: (minCroppedHeight + maxCroppedHeight) / 2,
                    },
                    ready: () => {
                        this.ready = true;
                    },
                    crop: (event) => {
                        this.scaleX = event.detail.scaleX;
                        this.scaleY = event.detail.scaleY;

                        let { width: w, height: h } = this.cropper.getData(true);
                        this.width = w;
                        this.height = h;

                        if (
                            (this.width < minCroppedWidth ||
                                this.height < minCroppedHeight ||
                                this.width > maxCroppedWidth ||
                                this.height > maxCroppedHeight) &&
                            this.cropper.element.clientHeight >= this.height &&
                            this.cropper.cropper.clientWidth >= this.width
                        ) {
                            this.cropper.setData({
                                width: Math.max(minCroppedWidth, Math.min(maxCroppedWidth, this.width)),
                                height: Math.max(minCroppedHeight, Math.min(maxCroppedHeight, this.height)),
                            });
                        }
                    },
                });
            },
            scale(change) {
                this.cropper.scale((this.scaleX || 1) + change, (this.scaleY || 1) + change);
            },
            zoom(change) {
                this.cropper.zoom(change);
            },
            rotate(change) {
                this.cropper.rotate(change);
            },
            isValidSizeParam(param) {
                return this.config[param].min <= this[param] && this[param] <= this.config[param].max;
            },
            getErrorMessage(param) {
                if (param === 'height' || param === 'width') {
                    return this.$t('imageValidationResolutionError', {
                        min: this.config[param].min,
                        max: this.config[param].max,
                    });
                }
            },
            async crop() {
                let img = this.cropper
                    .getCroppedCanvas()
                    .toDataURL(this.image.mediaType || `image/${this.format}`);
                img = img.replace(/data:\w*\/?\w*;?(base64)?,/, ''); // Remove data url info (data:image/png;base64,)
                this.resized.push({ ...this.image, content: img });
                this.currentImageIdx += 1;

                if (this.currentImageIdx === this.images.length) {
                    this.$emit('validated', this.resized);
                }
            },
            close() {
                if (this.$refs.modal.isOpen) {
                    this.$refs.modal.close();
                }
            },
            open() {
                if (!this.$refs.modal.isOpen) {
                    this.$refs.modal.open();
                }
            },
        },
    };
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
        width: 100%;
        aspect-ratio: 3/2;
    }
    @media (max-width: 991px) {
        .modal-img {
            aspect-ratio: 1;
        }
    }
</style>
