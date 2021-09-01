<template>
    <Modal class="validator-modal" :opt="{ footer: false }" @close="$emit('cancel')">
        <template #body>
            <div class="mb-3" style="max-height: 60vh">
                <img ref="image" :src="makeDataImageUrl(image)" />
            </div>
            <div class="mb-3">
                <div class="btn-group">
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
                <div class="btn-group">
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
            </div>
            <p v-for="param in checkParams" :key="param">
                {{ $u.capitalize($t(param)) }}: {{ $data[param] }}px.
                <span v-if="!isValidSizeParam(param)" class="error">
                    {{ getErrorMessage(param) }}
                </span>
            </p>
            <button :disabled="!isValid" class="btn btn-primary" @click="crop">
                {{ $t('Crop') }}
            </button>
        </template>
    </Modal>
</template>

<script>
    import Cropper from 'cropperjs/dist/cropper.js';
    import Modal from '../../../components/items/modal/Modal.vue';
    import { makeDataImageUrl } from '../../../utils';

    const allowedExtensions = ['jpeg', 'png', 'webp'];

    export default {
        name: 'ImageResolutionValidatorModal',
        components: { Modal },
        props: {
            field: { type: Object, required: true },
            images: { type: Array, required: true },
        },
        data: () => ({
            makeDataImageUrl,
            width: 0,
            height: 0,
            currentImageIdx: 0,
            resized: [],
            checkParams: ['width', 'height'],
        }),
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
            image: 'updateCroppie',
        },
        mounted() {
            this.cropper = new Cropper(this.$refs.image, {
                crop: (event) => {
                    this.scaleX = event.detail.scaleX;
                    this.scaleY = event.detail.scaleY;

                    let { width: w, height: h } = this.cropper.getData(true);
                    this.width = w;
                    this.height = h;

                    const newData = ['width', 'height'].reduce((map, val) => {
                        const { min, max } = this.config[val];
                        const value = event.detail[val];
                        if (value < min || value > max) {
                            map.set(val, Math.max(min, Math.min(max, value)));
                        }
                        return map;
                    }, new Map());
                    if (newData.size) this.cropper.setData(Object.fromEntries(newData));
                },
            });
        },
        beforeDestroy() {
            this.cropper.destroy();
        },
        methods: {
            scale(change) {
                this.cropper.scale((this.scaleX || 1) + change, (this.scaleY || 1) + change);
            },
            zoom(change) {
                this.cropper.zoom(change);
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
        },
    };
</script>

<style scoped lang="scss">
    .validator-modal::v-deep {
        img {
            display: block;
            max-width: 100%;
        }
        .modal-container {
            width: unset;
            max-width: 85vw;
        }
        .btn-title {
            cursor: default;
        }
    }
    .error {
        color: red;
    }
</style>
