<template functional>
    <button type="button" :class="props.classes" :style="props.styles" @click="listeners.clicked">
        <i v-if="props.iconClasses" :class="props.iconClasses" />
        <span :class="props.titleClasses" v-text="props.title" />
    </button>
</template>

<script>
    export default {
        name: 'OperationButton',
        props: {
            title: { type: String, required: true },
            classes: { type: Array, required: false, default: () => ['btn', 'btn-default'] },
            titleClasses: { type: Array, required: false, default: () => [] },
            iconClasses: { type: Array, required: false, default: () => null },
            styles: { type: Object, required: false, default: () => ({}) },
        },
    };
</script>
