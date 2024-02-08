<template>
    <button type="button" :title="$t(title)" :class="buttonClasses">
        <i v-if="iconClasses" class="icon-for-btn" :class="iconClasses" />
        <span v-if="title" class="title-for-btn" :class="{ 'd-none d-lg-inline-block': iconClasses }">
            {{ $t(title) }}
        </span>
    </button>
</template>

<script>
    export default {
        name: 'OperationButton',
        inheritAttrs: false,
        props: {
            name: { type: String, default: null },
            title: { type: String, required: true },
            classes: { type: [Array, String], default: () => ['btn', 'btn-default'] },
            iconClasses: { type: [Array, String], default: () => null },
        },
        computed: {
            buttonClasses() {
                const classes = this.name ? [`operation__${this.name}`] : [];
                return classes.concat(this.classes);
            },
        },
    };
</script>
