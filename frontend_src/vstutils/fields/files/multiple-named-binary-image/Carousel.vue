<template>
    <div class="container text-center my-3">
        <swiper-container ref="swiperRef" :slides-per-view="slidesPerView">
            <swiper-slide
                v-for="(item, idx) in preparedItems"
                :key="idx"
                style="cursor: pointer"
                class="slide"
                @click="onClick(idx)"
            >
                <div class="content" style="overflow: hidden">
                    <span
                        v-if="$listeners['remove-file']"
                        class="fa fa-times btn-default remove-file"
                        @click.stop="emit('remove-file', idx)"
                    />
                    <img
                        :src="item.imgSrc"
                        :alt="item.name ?? ''"
                        style="margin: 4px auto 16px auto; width: 90%; height: auto"
                    />
                    <div class="item-title">
                        {{ item.name }}
                    </div>
                </div>
            </swiper-slide>
        </swiper-container>
        <BootstrapModal ref="modalRef" :title="$ts(name)" render-body-when-shown>
            <swiper-container class="modal-slider" pagination="true">
                <swiper-slide v-for="(item, idx) in preparedItems" :key="idx">
                    <img
                        :src="item.imgSrc"
                        :alt="item.name ?? ''"
                        style="max-width: 100%; max-height: 100%"
                    />
                </swiper-slide>
            </swiper-container>
        </BootstrapModal>
    </div>
</template>

<script setup lang="ts">
    import { useEventListener } from '@vueuse/core';
    import { makeDataImageUrl } from '#vstutils/utils';
    import BootstrapModal from '#vstutils/components/BootstrapModal.vue';
    import type { NamedFile } from '../named-binary-file';
    import { computed, ref } from 'vue';

    const props = defineProps<{
        items: NamedFile[];
        name: string;
        readonly?: boolean;
    }>();
    const emit = defineEmits<{
        (e: 'remove-file', index: number): void;
    }>();

    const swiperRef = ref<any>();
    const modalRef = ref<InstanceType<typeof BootstrapModal>>();
    const selectedImageIdx = ref(0);
    const slidesPerView = ref(2);

    const preparedItems = computed(() => {
        return props.items.map((i) => {
            return { ...i, imgSrc: makeDataImageUrl(i) };
        });
    });

    function onClick(idx: number) {
        selectedImageIdx.value = idx;
        modalRef.value!.open();
    }

    function calculateSlidesPerView() {
        const width = swiperRef.value?.clientWidth;
        const perPage = Math.floor(width / 150);
        slidesPerView.value = perPage > 0 ? perPage : 1;
    }
    calculateSlidesPerView();
    useEventListener(window, 'resize', calculateSlidesPerView);
</script>

<style scoped lang="scss">
    .item-title {
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;

        font-size: 15px;
        @media (max-width: 420px) {
            font-size: 13px;
        }
        @media (max-width: 768px) {
            font-size: 14px;
        }
    }
    .slide {
        height: 100%;
        display: flex;
        align-items: stretch;
        padding: 8px;
    }
    .content {
        border-radius: 5px;
        position: relative;
        box-shadow: 1px 1px 5px 0 #b0b0b0;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        width: 100%;
        padding: 8px;
    }
    .remove-file {
        position: absolute;
        right: 6px;
        top: 3px;
        background-color: transparent;
    }
    .remove-file:hover {
        transform-origin: center;
        transition: transform 0.05s ease-in-out;
        transform: scale(1.05);
        background-color: transparent;
    }

    .modal-slider {
        width: 100%;
        --swiper-pagination-color: gray;

        img {
            width: 100%;
            height: auto;
            object-fit: contain;
        }
    }
</style>
