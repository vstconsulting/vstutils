<template>
    <div>
        <div class="input-group">
            {{ val }}
        </div>
        <Carousel v-if="value.length" :items="value" :name="$t(field.title)" />
    </div>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../../base';
    import { MultipleNamedBinaryFileFieldContentReadonly } from '../multiple-named-binary-file';
    import Carousel from './Carousel';

    export default {
        components: {
            Carousel,
        },
        mixins: [BaseFieldContentReadonlyMixin, MultipleNamedBinaryFileFieldContentReadonly],
    };
</script>
