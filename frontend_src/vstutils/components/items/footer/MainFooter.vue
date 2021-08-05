<template>
    <footer class="main-footer elevation-3 d-print-none">
        <!-- Empty span used to maintain height of the footer -->
        <span class="whitespace">&nbsp;</span>

        <a v-if="showBackButton" class="btn-previous-page" href="#" @click.prevent="$root.goBack">
            <strong>
                <i class="fas fa-chevron-left" />
            </strong>
        </a>
        <h1
            v-if="showTitle && title"
            class="page-title"
            :class="{ 'd-none d-sm-inline-block': hideTitleOnMobile }"
        >
            {{ title }}
        </h1>
        <Breadcrumbs v-if="showBreadcrumbs && breadcrumbs" :items="breadcrumbs" style="margin-left: auto" />
    </footer>
</template>

<script>
    import { Breadcrumbs } from '../../common';

    export default {
        name: 'MainFooter',
        components: { Breadcrumbs },
        props: {
            showBackButton: { type: Boolean, required: false, default: true },
            showTitle: { type: Boolean, required: false, default: true },
            hideTitleOnMobile: { type: Boolean, required: false, default: true },
            showBreadcrumbs: { type: Boolean, required: false, default: true },
        },
        computed: {
            title() {
                return this.$store.state.pageTitle;
            },
            breadcrumbs() {
                return this.$store.state.breadcrumbs;
            },
        },
    };
</script>

<style>
    .main-footer {
        display: flex;
    }
    .main-footer > *:not(.whitespace) {
        margin-right: 0.5rem;
    }
    .btn-previous-page {
        padding: 0 5px;
    }
    .page-title {
        display: inline-block;
        margin: 0;
        font-size: 1rem;
        line-height: 1.5;
    }
</style>
