<template>
    <router-link :to="{ name: 'home' }" class="logo-link nav-link brand-link logo">
        <span @click="hideSidebar">
            <i class="nav-icon fa fa-globe mr-2" style="margin-left: 20px" />
            <span class="brand-text font-weight-light">{{ $t(title) }}</span>
        </span>
    </router-link>
</template>

<script>
    import $ from 'jquery';

    /**
     * Logo component.
     */
    export default {
        name: 'Logo',
        props: {
            title: {
                type: String,
                default: () => '',
            },
        },
        methods: {
            hideSidebar() {
                if (document.body.classList.contains('sidebar-open')) {
                    $('[data-widget="pushmenu"]').PushMenu('collapse');
                }
            },
        },
    };
</script>

<style scoped>
    .logo-link {
        padding: 0.8125rem 0.5rem !important;
    }
    .brand-link {
        border-bottom-color: var(--left-sidebar-border-color) !important;
        padding: 0.75rem 0.5rem;
    }
    .brand-link:hover {
        color: rgba(255, 255, 255, 0.8) !important;
    }
</style>
