<template>
    <div class="container-fluid">
        <ErrorPage :error="{ status: 404 }" :error-data="message" />
    </div>
</template>
<script>
    import { BaseViewMixin, ErrorPage } from '#vstutils/components';

    export default {
        components: { ErrorPage },
        mixins: [BaseViewMixin],
        data() {
            return {
                message: 'Page matching current url was not found',
            };
        },
        computed: {
            title() {
                return this.$t('Error') + ' 404';
            },
        },
    };
</script>
