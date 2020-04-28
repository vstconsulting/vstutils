<template>
    <div>
        <div>
            <input :class="classes" :styles="styles" disabled :value="val" />
        </div>
        <div>
            <ul class="multiple-files-list">
                <template v-for="(file, idx) in value">
                    <li :key="idx">
                        <div>
                            <span class="break-word">{{ file.name }}</span>
                        </div>
                    </li>
                </template>
            </ul>
        </div>
    </div>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../../base';
    import MultipleNamedBinaryFileFieldContent from './MultipleNamedBinaryFileFieldContent.js';

    export default {
        mixins: [BaseFieldContentReadonlyMixin, MultipleNamedBinaryFileFieldContent],
    };
</script>

<style></style>
