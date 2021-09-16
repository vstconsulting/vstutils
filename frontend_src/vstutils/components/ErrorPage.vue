<template>
    <div class="row">
        <div class="col-12 d-flex justify-content-center align-items-center">
            <h2 class="status">
                <span v-if="error && error.status">{{ error.status }}</span>
                <i v-else class="fas fa-exclamation-triangle" />
            </h2>
            <div class="d-flex flex-column justify-content-center">
                <h3 class="margin-0">
                    {{ $t('Oops! Something went wrong.') }}
                </h3>
                <p class="margin-0">
                    {{ $t(errorData) }}
                </p>
            </div>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'ErrorPage',
        props: {
            errorData: {
                type: String,
                required: true,
            },
            error: {
                type: [Object, Error],
                default: () => ({}),
            },
        },
    };
</script>

<style scoped>
    .status {
        font-size: 70px;
        font-weight: 200;
        color: #ffc107 !important;
        margin-right: 10px;
        margin-bottom: 0;
    }
    .margin-0 {
        margin: 0;
    }
</style>
