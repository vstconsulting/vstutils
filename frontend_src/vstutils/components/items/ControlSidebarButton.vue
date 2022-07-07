<template>
    <router-link v-if="to" :to="to" class="btn btn-block btn-secondary">
        <i v-if="iconClass" :class="iconClass" />
        <slot>{{ text }}</slot>
    </router-link>
    <a v-else-if="href" :href="href" class="btn btn-block btn-secondary">
        <i v-if="iconClass" :class="iconClass" />
        <slot>{{ text }}</slot>
    </a>
    <button v-else class="btn btn-block btn-secondary">
        <i v-if="iconClass" :class="iconClass" />
        <slot>{{ text }}</slot>
    </button>
</template>

<script>
    export default {
        name: 'ControlSidebarButton',
        props: {
            to: { type: [Object, String], default: null },
            href: { type: String, default: '' },
            iconClass: { type: String, default: '' },
            text: { type: String, default: '' },
        },
    };
</script>
