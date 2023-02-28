<template>
    <BootstrapModal
        v-if="value && value.length > 0"
        classes="modal-lg"
        :title="$ts(field.title)"
        @exit="shown = false"
        @shown="shown = true"
    >
        <template #body>
            <Splide v-if="shown" :options="options">
                <SplideSlide v-for="(item, idx) in preparedItems" :key="idx">
                    <img :src="item.imgSrc" :alt="item.name ?? ''" class="slide-image" />
                </SplideSlide>
            </Splide>
        </template>

        <template #activator="{ openModal }">
            <button type="button" class="btn" @click.stop="openModal">
                <i class="fas fa-eye" />
            </button>
        </template>
    </BootstrapModal>
</template>

<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { Splide, SplideSlide } from '@splidejs/vue-splide';

    import { makeDataImageUrl } from '@/vstutils/utils';
    import BootstrapModal from '@/vstutils/components/BootstrapModal.vue';

    import type MultipleNamedBinaryImageField from './MultipleNamedBinaryImageField';
    import type { ExtractRepresent } from '@/vstutils/fields/base';

    const props = defineProps<{
        field: MultipleNamedBinaryImageField;
        value: ExtractRepresent<MultipleNamedBinaryImageField> | null | undefined;
    }>();

    const options = {
        heightRatio: 1,
        perPage: 1,
        perMove: 1,
        rewind: true,
        rewindByDrag: true,
    };

    const shown = ref(false);

    const preparedItems = computed(() => {
        return (props.value ?? []).map((i) => {
            return { ...i, imgSrc: makeDataImageUrl(i) };
        });
    });
</script>

<style scoped>
    .btn {
        font-size: 1.5rem;
    }
    .slide-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
</style>
