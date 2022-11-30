<template>
    <div class="overlay dark">
        <i class="fa-2x fa-spin" :class="icon" />
    </div>
</template>
<script lang="ts">
    export default {
        props: {
            icon: { type: String, default: 'fas fa-sync-alt' },
        },
    };
</script>
