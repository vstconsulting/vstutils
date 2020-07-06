<template>
    <div class="card" :class="cardStyle ? 'card-' + cardStyle : ''">
        <div class="card-header">
            <h3 v-if="title !== undefined" class="card-title">
                {{ title }}
            </h3>
            <div class="card-tools">
                <button type="button" class="btn btn-tool" data-card-widget="collapse">
                    <i class="fas fa-minus"></i>
                </button>
            </div>
        </div>
        <div class="card-body">
            <slot />
        </div>
    </div>
</template>
<script>
    export default {
        props: ['title', 'cardStyle'],
    };
</script>
<style scoped>
    .card {
        margin: 10px 0;
    }
    .card-header {
        height: 30px;
        padding: 7px;
    }
    .card-title {
        font-size: 1rem;
        line-height: 1rem;
    }
    .btn-tool {
        margin: -0.45rem 0 0 0;
    }
    .card-body {
        padding: 10px 0 0 20px;
    }
</style>
