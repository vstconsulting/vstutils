<template functional>
    <button
        type="button"
        :title="props.title"
        :class="props.classes"
        :style="props.styles"
        @click="listeners.clicked"
    >
        <i v-if="props.iconClasses" class="icon-for-btn" :class="props.iconClasses" />
        <span
            v-if="props.title"
            class="title-for-btn"
            :class="{ 'd-none d-lg-inline-block': props.iconClasses }"
        >
            {{ parent.$t(props.title) }}
        </span>
    </button>
</template>

<script>
    export default {
        name: 'OperationButton',
        props: {
            title: { type: String, required: true },
            classes: { type: [Array, String], default: () => ['btn', 'btn-default'] },
            iconClasses: { type: [Array, String], default: () => null },
            styles: { type: Object, default: () => ({}) },
        },
    };
</script>
