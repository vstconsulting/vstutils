<template>
    <div>
        <template v-for="(item, idx) in operations">
            <template v-if="item.component">
                <component :key="idx" :is="item.component" :options="item"></component>
            </template>
            <template v-else>
                <gui_button_common
                    type="operation"
                    :key="idx"
                    :options="item"
                    :look="{ classes: ['btn-primary'] }"
                />
            </template>
        </template>

        <gui_group_of_buttons
            type="sublink"
            :title="$t('sublinks')"
            classes="btn-default"
            :buttons="sublinks"
        ></gui_group_of_buttons>

        <gui_group_of_buttons
            type="action"
            :title="$t('actions')"
            classes="btn-warning"
            :buttons="actions"
        ></gui_group_of_buttons>

        <template v-if="view.schema.type == 'list'">
            <gui_filters_modal :opt="filters_opt" :view="view" :data="data"></gui_filters_modal>
            <pagination :options="data.pagination"></pagination>
        </template>
    </div>
</template>

<script>
    import $ from 'jquery';

    /**
     * Component for buttons wrapper - container, that includes all buttons for current view.
     */
    export default {
        name: 'gui_buttons_row',
        props: ['view', 'data', 'opt'],
        computed: {
            schema() {
                return this.view.schema;
            },

            operations() {
                return this.getButtons('operations');
            },

            actions() {
                return this.getButtons('actions');
            },

            sublinks() {
                return this.getButtons('sublinks');
            },

            filters_opt() {
                return $.extend(true, {}, this.opt, { store: 'filters' });
            },
        },
        methods: {
            getButtons(buttons_name) {
                return this.view.getViewSublinkButtons(
                    buttons_name,
                    this.schema[buttons_name],
                    this.data.instance,
                );
            },
        },
    };
</script>

<style scoped></style>
