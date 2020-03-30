<template>
    <div class="content-wrapper-2">
        <section class="content-header">
            <h1>
                <span @click="goToHistoryRecord(-1)" class="btn btn-default btn-previous-page">
                    <span class="fa fa-arrow-left"></span>
                </span>
                <span class="h1-header">{{ $t(title.toLowerCase()) | capitalize }}</span>
            </h1>
        </section>
        <section class="content">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-lg-12">
                        <div class="error-text-wrapper">
                            <p class="text-center error-p">{{ $t(message.toLowerCase()) | capitalize }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<script>
    import { BasestViewMixin } from '../mixins';
    export default {
        mixins: [BasestViewMixin],
        data() {
            return {
                message: '',
            };
        },
    };
</script>

<style scoped></style>
