<template>
    <div class="list-content-component">
        <template v-if="is_empty">
            <p class="text-center empty-list-p">
                {{ $t('list is empty') | capitalize }}
            </p>
        </template>
        <template v-else>
            <gui_list_table :instances="instances" :fields="fields" :view="view" :opt="opt" />
        </template>
    </div>
</template>

<script>
    import { isEmptyObject } from '../../../utils';

    /**
     * Base component for content part (area for representation of view data) of 'list' views.
     */
    export default {
        name: 'gui_entity_list',
        props: ['datastore', 'view', 'opt'],
        computed: {
            instances() {
                return this.datastore.data.instances;
            },
            fields() {
                return this.view.objects.model.fields;
            },
            is_empty() {
                return isEmptyObject(this.instances);
            },
        },
    };
</script>

<style scoped></style>
