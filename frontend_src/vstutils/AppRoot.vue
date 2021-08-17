<template>
    <div id="RealBody" style="display: none" class="wrapper" :class="classes">
        <TopNavigation :show-back-button="showBackButton" />

        <aside class="main-sidebar sidebar-dark-primary elevation-4">
            <Logo :title="info.title" />
            <Sidebar :menu="x_menu" :docs="x_docs" />
        </aside>

        <div class="content-wrapper">
            <router-view ref="currentViewComponent" />
        </div>

        <MainFooter
            :show-back-button="showBackButton"
            :show-title="showTitle"
            :hide-title-on-mobile="hideTitleOnMobile"
            :show-breadcrumbs="showBreadcrumbs"
        />

        <ControlSidebar />

        <portal-target name="root-bottom" multiple />
    </div>
</template>
<script>
    import { formatPath } from './utils';
    import AutoUpdateController from './autoupdate/AutoUpdateController.js';
    import ControlSidebar from './components/items/ControlSidebar.vue';
    import { Logo, MainFooter, Sidebar, TopNavigation } from './components/items';

    export default {
        name: 'AppRoot',
        components: { TopNavigation, ControlSidebar, MainFooter, Sidebar, Logo },
        mixins: [AutoUpdateController],
        props: {
            info: { type: Object, required: true },
            // eslint-disable-next-line vue/prop-name-casing
            x_menu: { type: Array, required: true },
            // eslint-disable-next-line vue/prop-name-casing
            x_docs: { type: Object, required: true },
        },
        data: () => ({
            layoutClasses: ['sidebar-mini', 'layout-fixed', 'layout-footer-fixed'],
        }),
        computed: {
            showBackButton() {
                return this.$route.name !== 'home';
            },
            showTitle() {
                return true;
            },
            hideTitleOnMobile() {
                return true;
            },
            showBreadcrumbs() {
                return true;
            },
            currentRouteClassName() {
                const routeName = this.$route?.name
                    ?.replace(/^\/|\/$/g, '') // Remove leading and ending slashes
                    .replace(/[{}]/g, '') // Remove brackets
                    .replace(/\//g, '_'); // Replace slashes with underscores;

                if (routeName) {
                    return 'page-' + routeName;
                }

                return null;
            },
            userPermissionClasses() {
                return ['is_superuser', 'is_staff'].filter((c) => window[c]);
            },
            bodyClasses() {
                return [...this.userPermissionClasses, ...this.layoutClasses];
            },
            classes() {
                return [];
            },
        },
        watch: {
            currentRouteClassName: { handler: 'updateBodyClass', immediate: true },
        },
        created() {
            document.body.classList.add(...this.bodyClasses);
        },
        methods: {
            goBack() {
                const parentPath = this.$refs.currentViewComponent?.view?.parent?.path;
                if (parentPath) {
                    return this.$router.push({ path: formatPath(parentPath, this.$route.params) });
                }
                return this.$router.push({ name: 'home' });
            },
            updateBodyClass(newClass, oldClass) {
                if (oldClass) {
                    document.body.classList.remove(oldClass);
                }
                if (newClass) {
                    document.body.classList.add(newClass);
                }
            },
        },
    };
</script>
