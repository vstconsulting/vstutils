<template>
    <div>
        <div>
            <input :class="classes" :styles="styles" disabled :value="val" />
        </div>
        <div>
            <ul class="multiple-files-list">
                <li
                    v-for="(file, idx) in value"
                    :key="idx"
                    title="Download file"
                    @click="fileClickHandler(file)"
                >
                    <div>
                        <span class="break-word">{{ file.name }}</span>
                    </div>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../../base';
    import MultipleNamedBinaryFileFieldContent from './MultipleNamedBinaryFileFieldContent.js';
    import { downloadBase64File } from '../../../utils';

    export default {
        mixins: [BaseFieldContentReadonlyMixin, MultipleNamedBinaryFileFieldContent],
        methods: {
            fileClickHandler(file) {
                downloadBase64File('text/plain', file.content, file.name);
            },
        },
    };
</script>

<style scoped>
    li {
        cursor: pointer;
    }
</style>
