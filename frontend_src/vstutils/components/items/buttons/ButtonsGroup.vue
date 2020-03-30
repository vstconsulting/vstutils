<template>
    <span>
        <template v-if="groupButtonsOrNot">
            <gui_buttons_list
                :buttons="buttons"
                :type="type"
                :text="title"
                :look="{ classes: classes }"
            ></gui_buttons_list>
        </template>
        <template v-else>
            <gui_button_common
                v-for="(item, idx) in buttons"
                :key="idx"
                :type="type"
                :options="item"
                :look="{ classes: classes }"
            />
        </template>
    </span>
</template>

<script>
    import $ from 'jquery';
    /**
     * Component for buttons, that can be grouped on small screens in drop-down list (Actions, Sublinks on page view, for example)
     * for can be represented as independent buttons on big screens
     */
    export default {
        name: 'gui_group_of_buttons',
        props: ['title', 'type', 'buttons', 'classes'],
        data: function () {
            return {
                window_width: window.innerWidth,
            };
        },
        mounted() {
            window.addEventListener('resize', () => {
                this.window_width = window.innerWidth;
            });
        },
        computed: {
            groupButtonsOrNot() {
                let buttons_amount = 0;
                if (typeof this.buttons == 'number') {
                    buttons_amount = this.buttons;
                } else if (typeof this.buttons == 'string') {
                    buttons_amount = Number(this.buttons) || 0;
                } else if (typeof this.buttons == 'object') {
                    if ($.isArray(this.buttons)) {
                        buttons_amount = this.buttons.length;
                    } else {
                        buttons_amount = Object.keys(this.buttons).length;
                    }

                    for (let i in this.buttons) {
                        if (this.buttons[i].hidden) {
                            buttons_amount--;
                        }
                    }
                }

                if (buttons_amount < 2) {
                    return false;
                } else if (buttons_amount >= 2 && buttons_amount < 5) {
                    if (this.window_width >= 992) {
                        return false;
                    }
                } else if (buttons_amount >= 5 && buttons_amount < 8) {
                    if (this.window_width >= 1200) {
                        return false;
                    }
                } else if (buttons_amount >= 8) {
                    if (this.window_width >= 1620) {
                        return false;
                    }
                }

                return true;
            },
        },
    };
</script>

<style scoped></style>
