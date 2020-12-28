<template>
    <div class="btn-group" role="group">
        <button
            type="button"
            class="btn dropdown-toggle highlight-tr-none gui-btn"
            :class="classes"
            data-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
            :aria-label="text"
        >
            {{ $t(text.toLowerCase()) | capitalize }}
            <span class="caret" />
        </button>
        <ul class="dropdown-menu dropdown-menu-right">
            <gui_button_li
                v-for="(button, idx) in buttons"
                :key="idx"
                :type="type"
                :options="button"
                :instance_id="instance_id"
            />
        </ul>
    </div>
</template>

<script>
    /**
     * Component for drop-down list of buttons.
     */
    export default {
        name: 'gui_buttons_list',
        props: ['type', 'text', 'buttons', 'instance_id', 'look'],
        computed: {
            classes() {
                let classes = [];

                if (this.look && this.look.classes) {
                    classes = this.look.classes;
                }
                return classes;
            },
        },
    };
</script>

<style scoped></style>
