<template>
    <fields_wrapper :opt="options" :instance="instance"></fields_wrapper>
</template>

<script>
    /**
     * Mixin for gui_entity_{page, page_new, pade_edit, action} components.
     */
    export default {
        name: 'base_page_type_mixin',
        props: ['datastore', 'data', 'view', 'opt'],
        data() {
            return {
                options: {
                    store: 'objects',
                },
            };
        },
        computed: {
            instance() {
                return this.data.instance;
            },
        },
    };
</script>

<style scoped></style>
