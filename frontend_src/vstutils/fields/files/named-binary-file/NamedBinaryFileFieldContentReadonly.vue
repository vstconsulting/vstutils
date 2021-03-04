<template>
    <div>
        <a v-if="value.content" :href="link" :download="name || 'download'">{{ name }}</a>
        <input v-else :class="classes" :styles="styles" disabled :value="name" />
    </div>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../../base';
    import NamedBinaryFileFieldContent from './NamedBinaryFileFieldContent.js';
    import { makeDataImageUrl } from '../../../utils';

    export default {
        mixins: [BaseFieldContentReadonlyMixin, NamedBinaryFileFieldContent],
        computed: {
            link() {
                if (this.value && this.value.content) {
                    return makeDataImageUrl(this.value);
                }
            },
            name() {
                return this.value?.name || '';
            },
        },
    };
</script>

<style scoped></style>
