<template>
    <a href="/" class="logo-link nav-link brand-link logo">
        <i class="nav-icon fa fa-globe mr-2" style="margin-left: 20px;"></i>
        <span class="brand-text font-weight-light">{{ $t(title.toLowerCase()) | capitalize }}</span>
    </a>
</template>

<script>
    /**
     * Logo component.
     */
    export default {
        name: 'logo',
        props: ['title'],
    };
</script>

<style scoped></style>
