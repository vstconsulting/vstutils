<template>
    <div class="btn-group" role="group" v-show="selected">
        <button
            type="button"
            class="btn gui-btn dropdown-toggle highlight-tr-none"
            :class="classes"
            data-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
            :aria-label="text"
        >
            {{ text | capitalize | split }}
            <span class="caret"></span>
        </button>
        <ul class="dropdown-menu dropdown-menu-right">
            <gui_button_li
                v-for="(button, idx) in multi_actions || viewMultiActions"
                :key="idx"
                type="multi_action"
                :options="button"
            />
        </ul>
    </div>
</template>

<script>
    /**
     * Component for drop-down list of multi-actions.
     */
    export default {
        name: 'gui_multi_actions',
        props: ['multi_actions', 'opt'],
        computed: {
            viewMultiActions() {
                const view = app.views[this.$route.path];
                if (view) {
                    return view.schema.multi_actions;
                }
                return {};
            },
            store_url() {
                if (this.opt && this.opt.store_url) {
                    return this.opt.store_url;
                }
                return this.$route.path.replace(/^\/|\/$/g, '');
            },
            current_path() {
                return this.$route.name;
            },
            text() {
                return this.$t('actions on') + ' ' + this.selected + ' ' + this.$tc('on item', this.selected);
            },
            classes() {
                return ['btn-primary'];
            },
            selected() {
                const selection = this.$store.getters.getSelections(this.store_url);
                if (selection) {
                    return Object.values(selection).filter(Boolean).length;
                }
                return 0;
            },
        },
    };
</script>

<style scoped></style>
