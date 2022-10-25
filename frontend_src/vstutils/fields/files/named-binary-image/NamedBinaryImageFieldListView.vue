<template>
    <BootstrapModal v-if="src">
        <template #body>
            <img :src="src" alt="" class="image-field-content" />
        </template>
        <template #activator="{ openModal }">
            <div class="named-bin-image" :style="{ backgroundImage: cssUrl }" @click.stop="openModal" />
        </template>
    </BootstrapModal>
</template>

<script>
    import { BaseFieldListView } from '../../base';
    import BootstrapModal from '../../../components/BootstrapModal.vue';
    import { makeDataImageUrl } from '../../../utils';

    export default {
        name: 'NamedBinaryImageFieldListView',
        components: { BootstrapModal },
        mixins: [BaseFieldListView],
        computed: {
            src() {
                return this.value?.content ? makeDataImageUrl(this.value) : null;
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
        min-height: 47px;
    }
</style>

<style>
    tr td.column-format-namedbinimage {
        height: inherit;
        padding: 1px !important;
    }
</style>
