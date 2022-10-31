<template>
    <BootstrapModal classes="modal-lg" :title="$t(field.title)" @exit="shown = false" @shown="shown = true">
        <template #body>
            <Splide v-if="shown" :options="options">
                <SplideSlide v-for="(item, idx) in preparedItems" :key="idx">
                    <img :src="item.imgSrc" :alt="$t(item.name)" class="slide-image" />
                </SplideSlide>
            </Splide>
        </template>

        <template #activator="{ openModal }">
            <i :class="classes" @click.stop="openModal" />
            <p v-if="!value || value.length === 0">{{ title_for_empty_value }}</p>
        </template>
    </BootstrapModal>
</template>

<script>
    import { Splide, SplideSlide } from '@splidejs/vue-splide';
    import { BaseFieldContentReadonlyMixin } from '../../base';
    import { MultipleNamedBinaryFileFieldContentReadonly } from '../multiple-named-binary-file';
    import BootstrapModal from '../../../components/BootstrapModal.vue';
    import { makeDataImageUrl } from '../../../utils';

    export default {
        components: { BootstrapModal, Splide, SplideSlide },
        mixins: [BaseFieldContentReadonlyMixin, MultipleNamedBinaryFileFieldContentReadonly],
        data() {
            return {
                shown: false,
                options: {
                    heightRatio: 1,
                    perPage: 1,
                    perMove: 1,
                    rewind: true,
                    rewindByDrag: true,
                },
            };
        },
        computed: {
            preparedItems() {
                return this.value.map((i) => {
                    return { ...i, imgSrc: makeDataImageUrl(i) };
                });
            },
            classes() {
                if (this.value && this.value?.length > 0) {
                    return 'fas fa-eye';
                }
                return '';
            },
        },
    };
</script>

<style scoped>
    i {
        font-size: 1.5rem;
    }
    .slide-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
</style>
