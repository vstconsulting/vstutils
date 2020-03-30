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
                v-for="(button, idx) in multi_actions"
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
        props: ['instances', 'multi_actions', 'opt'],
        computed: {
            store_url() {
                return this.opt.store_url;
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
            selections() {
                return this.$store.getters.getSelections(this.store_url);
            },
            selected() {
                let count = 0;
                for (let i = 0; i < this.instances.length; i++) {
                    let instance = this.instances[i];
                    if (this.selections[instance.getPkValue()]) {
                        count++;
                    }
                }
                return count;
            },
        },
    };
</script>

<style scoped></style>
