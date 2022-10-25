<template>
    <BootstrapModal styles="width: 90vw; max-width: 1000px" :title="$t(field.title)">
        <template #body>
            <div class="input-group">
                {{ val }}
            </div>
            <Carousel v-if="value && value.length" :items="value" :name="$t(field.title)" />
        </template>

        <template #activator="{ openModal }">
            <i class="fas fa-eye" @click.stop="openModal" />
        </template>
    </BootstrapModal>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../../base';
    import { MultipleNamedBinaryFileFieldContentReadonly } from '../multiple-named-binary-file';
    import BootstrapModal from '../../../components/BootstrapModal.vue';
    import Carousel from './Carousel';

    export default {
        components: { BootstrapModal, Carousel },
        mixins: [BaseFieldContentReadonlyMixin, MultipleNamedBinaryFileFieldContentReadonly],
    };
</script>

<style scoped>
    i {
        font-size: 1.5rem;
    }
</style>
