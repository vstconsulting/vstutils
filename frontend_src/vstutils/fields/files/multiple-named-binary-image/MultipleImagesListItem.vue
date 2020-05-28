<template>
    <div class="multiple-images-list-item">
        <ImageBlock :field="field" :wrapper_opt="wrapper_opt" :data="data" :value="file" />
        <span class="file-name break-word">{{ file.name }}</span>
        <slot />
    </div>
</template>

<script>
    import { ImageBlock } from '../named-binary-image';
    import { BaseFieldInnerComponentMixin } from '../../base';

    export default {
        mixins: [BaseFieldInnerComponentMixin],
        props: ['file'],
        components: {
            ImageBlock: ImageBlock,
        },
    };
</script>

<style scoped>
    .multiple-images-list-item {
        padding-top: 5px;
        padding-bottom: 5px;
        padding-left: 10px;
        display: grid;
        grid-template-columns: 40px 1fr 38px;
        align-items: center;
    }

    .multiple-images-list-item .file-name {
        padding: 0 5px;
    }
</style>
