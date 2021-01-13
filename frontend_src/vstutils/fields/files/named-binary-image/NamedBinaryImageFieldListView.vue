<template>
    <div style="display: contents">
        <div class="named-bin-image" :style="{ backgroundImage: cssUrl }" @click.stop="isModalOpen = true" />
        <Modal v-show="isModalOpen" :opt="{ footer: false }" @close="isModalOpen = false">
            <template #body>
                <img :src="src" alt="" class="image-field-content" />
            </template>
        </Modal>
    </div>
</template>

<script>
    import { BaseFieldListView } from '../../base';
    import Modal from '../../../components/items/modal/Modal.vue';

    export default {
        name: 'NamedBinaryImageFieldListView',
        components: { Modal },
        mixins: [BaseFieldListView],
        data() {
            return {
                isModalOpen: false,
            };
        },
        computed: {
            src() {
                return 'data:image/png;base64,' + this.value.content;
            },
            cssUrl() {
                return `url("${this.src}")`;
            },
        },
    };
</script>

<style scoped>
    .named-bin-image {
        width: 100%;
        height: 100%;
        background-repeat: no-repeat;
        background-size: contain;
        background-position: center;
    }
</style>

<style>
    tr td.column-format-namedbinimage {
        height: inherit;
        padding: 1px;
    }
</style>
