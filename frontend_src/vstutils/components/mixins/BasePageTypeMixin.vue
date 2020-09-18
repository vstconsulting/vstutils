<template>
    <fields_wrapper :opt="options" :datastore="datastore" />
</template>

<script>
    /**
     * Mixin for gui_entity_{page, page_new, pade_edit, action} components.
     */
    export default {
        name: 'base_page_type_mixin',
        props: ['datastore', 'view', 'opt'],
        data() {
            return {
                options: {},
            };
        },
    };
</script>

<style scoped></style>
