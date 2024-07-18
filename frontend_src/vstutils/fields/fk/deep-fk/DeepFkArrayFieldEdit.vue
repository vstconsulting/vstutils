<template>
    <FkTree
        :field="field.itemField"
        :value="value ?? []"
        multiple
        :min-items="field.minItems"
        :max-items="field.maxItems"
        @update:value="(value) => setValue(value)"
    />
</template>

<script>
    import { BaseFieldContentEdit } from '@/vstutils/fields/base';
    import FkTree from './FkTree.vue';

    export default {
        components: { FkTree },
        mixins: [BaseFieldContentEdit],
    };
</script>
