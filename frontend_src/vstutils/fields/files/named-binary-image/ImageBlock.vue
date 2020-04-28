<template>
    <div class="image-field-content-wrapper">
        <img :src="img_src" :alt="img_alt" class="image-field-content" @click="openImage" />
        <gui_modal v-show="show_modal" @close="closeImage" :opt="modal_opt">
            <template v-slot:header>
                <h3>{{ $t(img_alt.toLowerCase()) | capitalize | split }}</h3>
            </template>
            <template v-slot:body>
                <img :src="img_src" :alt="img_alt" class="image-field-content" />
            </template>
        </gui_modal>
    </div>
</template>

<script>
    import { BaseFieldInnerComponentMixin } from '../../base';
    export default {
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
                    return 'data:image/png;base64,' + this.value.content;
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
