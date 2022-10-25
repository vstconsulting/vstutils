<template>
    <div class="image-field-content-wrapper">
        <BootstrapModal :title="$t(img_alt)">
            <img style="max-height: 80vh" :src="img_src" :alt="img_alt" class="image-field-content" />
            <template #activator="{ openModal }">
                <img
                    :src="img_src"
                    :alt="img_alt"
                    class="image-field-content"
                    style="cursor: pointer"
                    @click="openModal"
                />
            </template>
        </BootstrapModal>
    </div>
</template>

<script>
    import { BaseFieldInnerComponentMixin } from '../../base';
    import BootstrapModal from '../../../components/BootstrapModal';
    import { makeDataImageUrl } from '../../../utils';
    export default {
        components: { BootstrapModal },
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
                } else {
                    return undefined;
                }
            },
            img_alt() {
                return this.field.title;
            },
        },
    };
</script>
