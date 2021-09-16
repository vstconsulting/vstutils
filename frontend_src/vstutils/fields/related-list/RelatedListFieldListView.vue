<template>
    <div style="display: contents">
        <i v-if="isEmpty" class="fas fa-eye" @click.stop="isModalOpen = true" />
        <i v-else class="inactive fas fa-eye" title="Empty" />

        <Modal v-if="isModalOpen" :opt="{ footer: false }" @close="isModalOpen = false">
            <template #header>
                <h3>{{ field.title }}</h3>
            </template>
            <template #body>
                <component :is="fieldComponent" :value="value" :model="field.itemsModel" />
            </template>
        </Modal>
    </div>
</template>

<script>
    import { BaseFieldListView } from '../base';
    import { Modal } from '../../components/items';
    import ListView from './ListView.vue';
    import TableView from './TableView.vue';
    import RelatedListFieldContentMixin from './RelatedListFieldContentMixin.js';

    export default {
        components: { TableView, ListView, Modal },
        mixins: [BaseFieldListView, RelatedListFieldContentMixin],
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

    i.inactive {
        color: rgba(0, 0, 0, 0.5);
    }
</style>

<style>
    .column-format-related_list {
        width: 70px;
        text-align: center;
    }
</style>
