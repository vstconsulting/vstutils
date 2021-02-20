<template>
    <div class="image-field-content-wrapper">
        <img :src="img_src" :alt="img_alt" class="image-field-content" @click="openImage" />
        <Modal v-show="show_modal" :opt="modal_opt" @close="closeImage">
            <template #header>
                <h3>{{ $t(img_alt.toLowerCase()) | capitalize | split }}</h3>
            </template>
            <template #body>
                <img :src="img_src" :alt="img_alt" class="image-field-content" />
            </template>
        </Modal>
    </div>
</template>

<script>
    import { BaseFieldInnerComponentMixin } from '../../base';
    import Modal from '../../../components/items/modal/Modal.vue';
    import { makeDataImageUrl } from '../../../utils';
    export default {
        components: { Modal },
        mixins: [BaseFieldInnerComponentMixin],
        data() {
            return {
                show_modal: false,
                modal_opt: {
                    footer: false,
                },
            };
        },
        computed: {
            img_src() {
                if (this.value && this.value.content) {
                    return makeDataImageUrl(this.value);
                }
            },
            img_alt() {
                return this.field.options.title || this.field.options.name;
            },
        },
        methods: {
            openImage() {
                this.show_modal = true;
            },
            closeImage() {
                this.show_modal = false;
            },
        },
    };
</script>

<style scoped></style>
