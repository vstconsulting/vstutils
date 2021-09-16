<template>
    <component :is="fieldComponent" :value="value" :model="field.itemsModel" />
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../base';
    import RelatedListFieldContentMixin from './RelatedListFieldContentMixin.js';

    export default {
        name: 'RelatedListFieldReadonlyView',
        mixins: [BaseFieldContentReadonlyMixin, RelatedListFieldContentMixin],
    };
</script>
