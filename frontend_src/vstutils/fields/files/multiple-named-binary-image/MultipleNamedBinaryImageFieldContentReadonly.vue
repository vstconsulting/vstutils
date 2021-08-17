<template>
    <div>
        <div class="input-group">
            {{ val }}
        </div>
        <div>
            <template v-for="(file, idx) in value">
                <MultipleImagesListItem :key="idx" :field="field" :data="data" :file="file" />
            </template>
        </div>
    </div>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../../base';
    import { MultipleNamedBinaryFileFieldContentEdit } from '../multiple-named-binary-file';
    import MultipleImagesListItem from './MultipleImagesListItem.vue';

    export default {
        components: {
            MultipleImagesListItem,
        },
        mixins: [BaseFieldContentReadonlyMixin, MultipleNamedBinaryFileFieldContentEdit],
    };
</script>
