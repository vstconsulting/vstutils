<template>
    <BootstrapModal :title="$t(field.title)">
        <template #body>
            <component :is="fieldComponent" :value="value" :model="field.itemsModel" />
        </template>
        <template #activator="{ openModal }">
            <i v-if="isEmpty" class="fas fa-eye" @click.stop="openModal" />
            <i v-else class="inactive fas fa-eye" title="Empty" />
        </template>
    </BootstrapModal>
</template>

<script>
    import { BaseFieldListView } from '../base';
    import BootstrapModal from '../../components/BootstrapModal.vue';
    import ListView from './ListView.vue';
    import TableView from './TableView.vue';
    import RelatedListFieldContentMixin from './RelatedListFieldContentMixin.js';

    export default {
        components: { TableView, ListView, BootstrapModal },
        mixins: [BaseFieldListView, RelatedListFieldContentMixin],
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
