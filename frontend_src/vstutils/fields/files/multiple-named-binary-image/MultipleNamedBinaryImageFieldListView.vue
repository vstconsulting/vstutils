<template>
    <div>
        <i class="fas fa-eye" @click.stop="isModalOpen = true" />
        <Modal
            v-if="isModalOpen"
            :opt="{ footer: false }"
            styles="width: 90vw; max-width: 1000px"
            @close="isModalOpen = false"
        >
            <template #header>
                <h3>{{ $t(field.title) }}</h3>
            </template>
            <template #body>
                <div class="input-group">
                    {{ val }}
                </div>
                <Carousel v-if="value.length" :items="value" :name="$t(field.title)" />
            </template>
        </Modal>
    </div>
</template>

<script>
    import { BaseFieldContentReadonlyMixin } from '../../base';
    import { MultipleNamedBinaryFileFieldContentReadonly } from '../multiple-named-binary-file';
    import { Modal } from '../../../components/items';
    import Carousel from './Carousel';

    export default {
        components: {
            Modal,
            Carousel,
        },
        mixins: [BaseFieldContentReadonlyMixin, MultipleNamedBinaryFileFieldContentReadonly],
        data() {
            return {
                isModalOpen: false,
            };
        },
    };
</script>

<style scoped>
    i {
        font-size: 1.5rem;
    }
</style>
