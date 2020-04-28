<template>
    <div :class="wrapper_classes" :style="wrapper_styles" v-show="!is_hidden">
        <button
            class="btn btn-primary"
            data-toggle="tooltip"
            :title="field.options.help || field.options.description"
            @click="onClickHandler"
            :aria-label="field.options.title || field.options.name"
        >
            {{ $t((field.options.title || field.options.name).toLowerCase()) | capitalize | split }}
        </button>
    </div>
</template>

<script>
    export default {
        methods: {
            /**
             * Method, that handles onclick event.
             */
            onClickHandler() {
                if (this.field.options.onclick) {
                    this.field.options.onclick();
                }
            },
        },
    };
</script>

<style></style>
