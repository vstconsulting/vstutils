<template>
    <Modal :opt="{ footer: false }" @close="$emit('cancel')">
        <template #header>
            <h3>{{ $t(field.title) }}</h3>
        </template>
        <template #body>
            <div ref="croppie" />
            <p :class="{ valid: isWidthValid }">
                Width: {{ width }}px.
                <span class="error">Must be between {{ config.minWidth }} and {{ config.maxWidth }}</span>
            </p>
            <p :class="{ valid: isHeightValid }">
                Height: {{ height }}px.
                <span class="error">Must be between {{ config.minHeight }} and {{ config.maxHeight }}</span>
            </p>
            <button :disabled="!isWidthValid || !isHeightValid" class="btn btn-primary" @click="crop">
                Crop
            </button>
        </template>
    </Modal>
</template>

<script>
    import Croppie from 'croppie';
    import Modal from '../../../components/items/modal/Modal.vue';

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
            isHeightValid() {
                return this.config.minHeight <= this.height && this.height <= this.config.maxHeight;
            },
            isWidthValid() {
                return this.config.minWidth <= this.width && this.width <= this.config.maxWidth;
            },
        },
        watch: {
            image: 'updateCroppie',
        },
        mounted() {
            this.croppie = new Croppie(this.$refs.croppie, {
                viewport: { width: this.config.minWidth, height: this.config.minHeight },
                boundary: { width: this.config.minWidth + 100, height: this.config.minHeight + 100 },
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
            updateCroppie() {
                this.croppie.bind({ url: `data:image/png;base64,${this.image.content}` });
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

    p.valid .error {
        display: none;
    }
</style>
