<template>
    <li class="dropdown-item" v-if="!options.hidden">
        <a
            class="sublink-btn highlight-tr-none"
            :class="class_with_name"
            @click="onClickHandler(instance_id)"
        >
            {{ title | capitalize | split }}
        </a>
    </li>
</template>

<script>
    import { BaseButtonMixin } from '../../mixins';

    /**
     * Component for buttons from drop-down list of buttons.
     * The same as 'gui_button_common' component, but with another DOM wrapper.
     */
    export default {
        name: 'gui_button_li',
        mixins: [BaseButtonMixin],
        props: ['options', 'instance_id'],
    };
</script>

<style scoped></style>
