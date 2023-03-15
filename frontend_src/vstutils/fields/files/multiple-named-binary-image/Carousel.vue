<template>
    <div class="container text-center my-3">
        <splide ref="splideRef" :options="options" @splide:mounted="updateOptions">
            <splide-slide
                v-for="(item, idx) in preparedItems"
                :key="idx"
                style="cursor: pointer"
                @click.native="onClick(idx)"
            >
                <div class="splide__container">
                    <div class="splide__content" style="overflow: hidden">
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
                </div>
            </splide-slide>
        </splide>
        <BootstrapModal ref="modalRef" :title="$ts(name)" render-body-when-shown>
            <splide class="modal-slider" :options="{ rewind: true, perPage: 1, start: selectedImageIdx }">
                <splide-slide v-for="(item, idx) in preparedItems" :key="idx">
                    <img
                        :src="item.imgSrc"
                        :alt="item.name ?? ''"
                        style="max-width: 100%; max-height: 100%"
                    />
                </splide-slide>
            </splide>
        </BootstrapModal>
    </div>
</template>

<script setup lang="ts">
    import { Splide, SplideSlide } from '@splidejs/vue-splide';
    import '@splidejs/splide/dist/css/splide.min.css';
    import { makeDataImageUrl } from '@/vstutils/utils';
    import BootstrapModal from '@/vstutils/components/BootstrapModal.vue';
    import type { NamedFile } from '../named-binary-file';
    import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

    const props = defineProps<{
        items: NamedFile[];
        name: string;
        readonly?: boolean;
    }>();
    const emit = defineEmits<{
        (e: 'remove-file', index: number): void;
    }>();

    const splideRef = ref<any>();
    const modalRef = ref<InstanceType<typeof BootstrapModal>>();
    const selectedImageIdx = ref(0);

    const preparedItems = computed(() => {
        return props.items.map((i) => {
            return { ...i, imgSrc: makeDataImageUrl(i) };
        });
    });

    watch(preparedItems, () => {
        nextTick().then(() => {
            splideRef.value?.splide.refresh();
        });
    });

    const options = {
        rewind: true,
        focus: 'center',
        perPage: 2,
        pagination: false,
        width: '90vw',
    };

    function onClick(idx: number) {
        selectedImageIdx.value = idx;
        modalRef.value!.open();
    }

    function updateOptions() {
        const width = splideRef.value?.$el.clientWidth;
        const perPage = Math.floor(width / 150);
        if (options.perPage !== perPage) {
            options.perPage = perPage;
            if (splideRef.value) {
                splideRef.value.splide.options = options;
            }
        }
    }

    onMounted(() => {
        window.addEventListener('resize', updateOptions);
    });
    onBeforeUnmount(() => {
        window.removeEventListener('resize', updateOptions);
    });
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
    .splide__container {
        height: 100%;
        display: flex;
        align-items: stretch;
        padding: 8px;
    }
    .splide__content {
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

        img {
            width: 100%;
            height: auto;
            object-fit: contain;
        }

        & ::v-deep .splide__pagination__page.is-active {
            border: 1px solid gray;
        }
    }
</style>
