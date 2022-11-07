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
        <portal-target name="titleAppend" />
        <Breadcrumbs
            v-if="showBreadcrumbs && breadcrumbs"
            v-show="!$app.store.page.loading"
            :items="breadcrumbs"
            style="margin-left: auto"
        />
    </footer>
</template>

<script>
    import { Breadcrumbs } from '../../common';
    export default {
        name: 'MainFooter',
        components: { Breadcrumbs },
        props: {
            showBackButton: { type: Boolean, default: true },
            showTitle: { type: Boolean, default: true },
            hideTitleOnMobile: { type: Boolean, default: true },
            showBreadcrumbs: { type: Boolean, default: true },
        },
        computed: {
            title() {
                return this.$app.store.title;
            },
            breadcrumbs() {
                return this.$app.store.breadcrumbs;
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
