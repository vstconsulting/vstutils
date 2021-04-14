<template>
    <Modal :opt="{ footer: false }" @close="$emit('cancel')">
        <template #header>
            <h3>{{ $t(field.title) }}</h3>
        </template>
        <template #body>
            <div ref="croppie" />
            <p v-for="param in checkParams" :key="param">
                {{ $t(param) | capitalize }}: {{ $data[param] }}px.
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
    import Croppie from 'croppie';
    import Modal from '../../../components/items/modal/Modal.vue';
    import { makeDataImageUrl } from '../../../utils';

    const allowedExtensions = ['jpeg', 'png', 'webp'];

    const topLeftX = 0,
        topLeftY = 1,
        bottomRightX = 2,
        bottomRightY = 3;

    export default {
        name: 'ImageResolutionValidatorModal',
        components: { Modal },
        props: {
            field: { type: Object, required: true },
            images: { type: Array, required: true },
        },
        data: () => ({
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
                return 'jpg';
            },
            isValid() {
                return this.checkParams.filter((param) => !this.isValidSizeParam(param)).length === 0;
            },
        },
        watch: {
            image: 'updateCroppie',
        },
        mounted() {
            this.croppie = new Croppie(this.$refs.croppie, {
                viewport: { width: this.config.width.min, height: this.config.height.min },
                boundary: { width: this.config.width.min + 100, height: this.config.height.min + 100 },
                enforceBoundary: true,
                enableResize: true,
                enableZoom: true,
            });
            this.updateCroppie();
            this.$refs.croppie.addEventListener('update', ({ detail }) => {
                const { points, zoom } = detail;
                this.width = Math.round((points[bottomRightX] - points[topLeftX]) * zoom);
                this.height = Math.round((points[bottomRightY] - points[topLeftY]) * zoom);
            });
        },
        beforeDestroy() {
            this.croppie.destroy();
        },
        methods: {
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
            updateCroppie() {
                this.croppie.bind({
                    url: makeDataImageUrl(this.image),
                });
            },
            async crop() {
                let img = await this.croppie.result({ type: 'base64', format: this.format });
                img = img.slice(img.search('base64,') + 7); // Remove data url info (data:image/png;base64,)
                this.resized.push({ ...this.image, content: img });
                this.currentImageIdx += 1;

                if (this.currentImageIdx === this.images.length) {
                    this.$emit('validated', this.resized);
                }
            },
        },
    };
</script>

<style scoped>
    .error {
        color: red;
    }
</style>
