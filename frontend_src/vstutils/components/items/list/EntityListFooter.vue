<template>
    <div class="list-footer-btns-wrapper">
        <gui_multi_actions
            v-if="multi_actions_exist"
            :multi_actions="schema.multi_actions"
            :opt="opt"
        />
        <pagination :options="datastore.data.pagination" />
    </div>
</template>

<script>
    import { BaseListTableMixin } from '../../mixins';

    /**
     * Base component for multi_actions_button_component part of 'list' views.
     */
    export default {
        name: 'gui_entity_list_footer',
        mixins: [BaseListTableMixin],
        props: ['datastore', 'view', 'opt'],
        computed: {
            schema() {
                return this.view.schema;
            },
        },
    };
</script>

<style scoped></style>
