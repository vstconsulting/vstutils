<template>
    <div class="container text-center my-3">
        <splide ref="splide" :options="options" @splide:mounted="updateOptions">
            <splide-slide
                v-for="(item, idx) in preparedItems"
                :key="idx"
                style="cursor: pointer"
                @click.native="onClick(item)"
            >
                <div class="splide__container">
                    <div class="splide__content" style="overflow: hidden">
                        <span
                            v-if="$listeners['remove-file']"
                            class="fa fa-times btn-default remove-file"
                            @click.stop="$emit('remove-file', idx)"
                        />
                        <img
                            :src="item.imgSrc"
                            :alt="item.name"
                            style="margin: 4px auto 16px auto; width: 90%; height: auto"
                        />
                        <div class="item-title">
                            {{ item.name }}
                        </div>
                    </div>
                </div>
            </splide-slide>
        </splide>
        <BootstrapModal ref="modal" :title="$t(name)">
            <img
                style="max-height: 80vh"
                :src="activeItem.imgSrc"
                :alt="activeItem.name"
                class="image-field-content"
            />
        </BootstrapModal>
    </div>
</template>

<script>
    import { Splide, SplideSlide } from '@splidejs/vue-splide';
    import '@splidejs/splide/dist/css/splide.min.css';
    import { makeDataImageUrl } from '../../../utils';
    import BootstrapModal from '../../../components/BootstrapModal';

    export default {
        components: { Splide, SplideSlide, BootstrapModal },
        props: {
            items: { type: Array, required: true },
            name: { type: String, default: '' },
        },
        data() {
            return {
                options: {
                    rewind: true,
                    focus: 'center',
                    perPage: 2,
                    pagination: false,
                    width: '90vw',
                },
                activeItem: {},
            };
        },
        computed: {
            preparedItems() {
                return this.items.map((i) => {
                    return { ...i, imgSrc: makeDataImageUrl(i) };
                });
            },
        },
        watch: {
            preparedItems() {
                this.$nextTick().then(() => {
                    this.$refs.splide.splide.refresh();
                });
            },
        },
        mounted() {
            window.addEventListener('resize', this.updateOptions);
        },
        beforeDestroy() {
            window.removeEventListener('resize', this.updateOptions);
        },
        methods: {
            updateOptions() {
                const width = this.$refs.splide.$el.clientWidth;
                const perPage = Math.floor(width / 150);
                if (this.options.perPage !== perPage) {
                    this.options.perPage = perPage;
                    this.$refs.splide.splide.options = this.options;
                }
            },
            onClick(item) {
                this.activeItem = { imgSrc: item.imgSrc, name: item.name };
                this.$refs.modal.open();
            },
        },
    };
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
</style>
