<template>
    <div>
        <router-link
            v-for="sublink in view.sublinks.values()"
            :key="sublink.name"
            v-slot="{ href }"
            :to="sublink.href"
        >
            <a
                :href="href"
                class="btn btn-primary"
                aria-pressed="true"
                role="button"
                v-text="sublink.title"
            />
        </router-link>

        <button
            v-for="action in view.actions.values()"
            :key="action.name"
            type="button"
            class="btn btn-primary"
            v-text="action.title"
        />

        <!--        <template v-for="(item, idx) in operations">-->
        <!--            <template v-if="item.component">-->
        <!--                <component :is="item.component" :key="idx" :options="item" />-->
        <!--            </template>-->
        <!--            <template v-else>-->
        <!--                <gui_button_common-->
        <!--                    :key="idx"-->
        <!--                    type="operation"-->
        <!--                    :options="item"-->
        <!--                    :look="{ classes: ['btn-primary'] }"-->
        <!--                />-->
        <!--            </template>-->
        <!--        </template>-->

        <!--        <gui_group_of_buttons-->
        <!--            type="sublink"-->
        <!--            :title="$t('sublinks')"-->
        <!--            classes="btn-default"-->
        <!--            :buttons="sublinks"-->
        <!--        />-->

        <!--        <gui_group_of_buttons type="action" :title="$t('actions')" classes="btn-warning" :buttons="actions" />-->

        <!--        <template v-if="view.type === 'list'">-->
        <!--            <gui_filters_modal :opt="filters_opt" :view="view" :datastore="datastore" />-->
        <!--            <pagination :options="datastore.data.pagination" />-->
        <!--        </template>-->
    </div>
</template>

<script>
    import $ from 'jquery';

    /**
     * Component for buttons wrapper - container, that includes all buttons for current view.
     */
    export default {
        name: 'gui_buttons_row',
        props: ['view', 'opt', 'datastore'],
        computed: {
            schema() {
                return this.view.params;
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
                const instance =
                    (this.datastore && this.datastore.data && this.datastore.data.instance) || {};
                return this.view.getViewSublinkButtons(buttons_name, this.schema[buttons_name], instance);
            },
        },
    };
</script>

<style scoped></style>
