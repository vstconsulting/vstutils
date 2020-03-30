<template>
    <div class="list-content-component">
        <template v-if="is_empty">
            <p class="text-center empty-list-p">
                {{ $t('list is empty') | capitalize }}
            </p>
        </template>
        <template v-else>
            <gui_list_table
                :instances="data.instances"
                :fields="fields"
                :view="view"
                :opt="opt"
            ></gui_list_table>
        </template>
    </div>
</template>

<script>
    /**
     * Base component for content part (area for representation of view data) of 'list' views.
     */
    export default {
        name: 'gui_entity_list',
        props: ['data', 'view', 'opt'],
        computed: {
            fields() {
                return this.view.objects.model.fields;
            },
            is_empty() {
                return isEmptyObject(this.data.instances);
            },
        },
    };
</script>

<style scoped></style>
