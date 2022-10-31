<template>
    <a v-if="value && value.content" :href="link" :download="name || 'download'" @click.stop>{{ name }}</a>
    <p v-else>{{ title_for_empty_value }}</p>
</template>

<script>
    import NamedBinaryFileFieldContentReadonly from './NamedBinaryFileFieldContentReadonly';

    export default {
        mixins: [NamedBinaryFileFieldContentReadonly],
    };
</script>
