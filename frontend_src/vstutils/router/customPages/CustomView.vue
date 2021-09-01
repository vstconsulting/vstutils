<template>
    <div class="container-fluid">
        <div class="row">
            <div class="col-lg-12">
                <div class="error-text-wrapper">
                    <p class="text-center error-p">
                        {{ $t(message) }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import BasestViewMixin from '../../views/mixins/BasestViewMixin.js';
    export default {
        mixins: [BasestViewMixin],
        data() {
            return {
                message: '',
            };
        },
    };
</script>
