<template>
    <div class="list-footer-btns-wrapper">
        <gui_multi_actions
            :instances="data.instances"
            :multi_actions="schema.multi_actions"
            :opt="opt"
            v-if="multi_actions_exist"
        ></gui_multi_actions>
        <pagination :options="data.pagination"></pagination>
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
        props: ['data', 'view', 'opt'],
        computed: {
            schema() {
                return this.view.schema;
            },
        },
    };
</script>

<style scoped></style>
