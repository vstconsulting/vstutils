<template>
    <div>
        <div class="input-group">
            <input :class="classes" :styles="styles" disabled :value="val" />
        </div>
        <div>
            <template v-for="(file, idx) in value">
                <MultipleImagesListItem
                    :key="idx"
                    :field="field"
                    :wrapper_opt="wrapper_opt"
                    :data="data"
                    :file="file"
                />
            </template>
        </div>
    </div>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../../base';
    import { MultipleNamedBinaryFileFieldContentEdit } from '../multiple-named-binary-file';
    import MultipleImagesListItem from './MultipleImagesListItem.vue';

    export default {
        mixins: [BaseFieldContentReadonlyMixin, MultipleNamedBinaryFileFieldContentEdit],
        components: {
            MultipleImagesListItem,
        },
    };
</script>

<style scoped></style>
