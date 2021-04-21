<template>
    <div>
        <slot name="activator" :openModal="open" :closeModal="close" />
        <portal to="root-bottom">
            <div ref="modal" class="modal fade" :class="wrapperClasses" tabindex="-1" role="dialog">
                <div class="modal-dialog" :class="classes" role="document">
                    <div class="modal-content">
                        <slot name="content" :closeModal="close" />
                    </div>
                </div>
            </div>
        </portal>
    </div>
</template>

<script>
    import $ from 'jquery';

    export default {
        name: 'BootstrapModal',
        props: {
            wrapperClasses: { type: [Array, String], required: false, default: null },
            classes: { type: [Array, String], required: false, default: null },
        },
        mounted() {
            $(this.$refs.modal).modal({ show: false });
        },
        methods: {
            open() {
                $(this.$refs.modal).modal('show');
            },
            close() {
                $(this.$refs.modal).modal('hide');
            },
        },
    };
</script>

<style scoped>
    .modal {
        cursor: auto;
    }
</style>
