<template>
    <div id="RealBody" class="wrapper" :class="classes">
        <TopNavigation :show-back-button="showBackButton" />

        <aside class="main-sidebar sidebar-dark-primary elevation-4">
            <Logo :title="info.title" />
            <Sidebar :menu="menuItems">
                <template v-if="sidebarTopComponent" #top>
                    <component :is="sidebarTopComponent" />
                </template>
                <template v-if="sidebarBottomComponent" #bottom>
                    <component :is="sidebarBottomComponent" />
                </template>
            </Sidebar>
        </aside>

        <div class="content-wrapper">
            <EntityView :key="$route.path">
                <router-view :key="$route.path" ref="currentViewComponent" />
            </EntityView>
        </div>

        <MainFooter
            :show-back-button="showBackButton"
            :show-title="showTitle"
            :hide-title-on-mobile="hideTitleOnMobile"
            :show-breadcrumbs="showBreadcrumbs"
        />

        <transition name="control-sidebar">
            <ControlSidebar v-if="isControlSidebarOpen" />
        </transition>

        <component :is="c" v-for="(c, name) in additionalComponents" :ref="name" :key="name" />

        <AppModals ref="appModals" />

        <portal-target name="root-bottom" multiple />
    </div>
</template>
<script lang="ts">
    import { ref } from 'vue';
    import ControlSidebar from './components/items/ControlSidebar.vue';
    import { Logo, MainFooter, Sidebar, TopNavigation, convertXMenuToSidebar } from './components/items';
    import ConfirmModal from './components/common/ConfirmModal.vue';
    import EntityView from './components/common/EntityView.vue';
    import AppModals from './components/common/AppModals.vue';

    import type { Component, PropType } from 'vue';
    import type { XMenu } from './AppConfiguration';

    const DARK_MODE_CLASS = 'dark-mode';

    export default {
        name: 'AppRoot',
        components: {
            TopNavigation,
            ControlSidebar,
            MainFooter,
            Sidebar,
            Logo,
            ConfirmModal,
            EntityView,
            AppModals,
        },
        props: {
            info: { type: Object, required: true },
            // eslint-disable-next-line vue/prop-name-casing
            x_menu: { type: Array as PropType<XMenu>, required: true },
            // eslint-disable-next-line vue/prop-name-casing
            x_docs: { type: Object, required: true },
        },
        setup() {
            const appModals = ref<InstanceType<typeof AppModals>>();

            return { appModals };
        },
        data() {
            return {
                layoutClasses: ['sidebar-mini', 'layout-fixed', 'layout-footer-fixed'],
                isControlSidebarOpen: false,
                userSettings: this.$app.userSettingsStore,
                localSettings: this.$app.localSettingsStore,
            };
        },
        computed: {
            sidebarTopComponent(): Component | null {
                return null;
            },
            sidebarBottomComponent(): Component | null {
                return null;
            },
            menuItems() {
                const menu = convertXMenuToSidebar(this.x_menu);

                menu.unshift({
                    name: 'Home',
                    to: '/',
                    icon: 'fas fa-tachometer-alt',
                });

                if (this.x_docs && this.x_docs.has_docs && this.x_docs.docs_url) {
                    menu.push({
                        name: 'Documentation',
                        href: this.x_docs.docs_url,
                        icon: 'fa fa-book',
                    });
                }

                return menu;
            },
            showBackButton() {
                return this.$route.name !== 'home' && this.$route.meta?.view.showBackButton;
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
                return (['is_superuser', 'is_staff'] as const).filter((c) => window[c]);
            },
            bodyClasses() {
                return [...this.userPermissionClasses, ...this.layoutClasses];
            },
            classes() {
                return [];
            },
            additionalComponents(): Record<string, Component> {
                return {};
            },
        },
        watch: {
            currentRouteClassName: { handler: 'updateBodyClass', immediate: true },
            'userSettings.settings.main.language': { handler: 'setLanguage', immediate: true },
            'userSettings.settings.main.dark_mode': { handler: 'setDarkMode', immediate: true },
        },
        created() {
            document.body.classList.add(...this.bodyClasses);
            this.$app.autoUpdateController.start();
        },
        beforeDestroy() {
            this.$app.autoUpdateController.stop();
        },
        methods: {
            goBack() {
                return this.$router.back();
            },
            updateBodyClass(newClass: string, oldClass: string) {
                if (oldClass) {
                    document.body.classList.remove(oldClass);
                }
                if (newClass) {
                    document.body.classList.add(newClass);
                }
            },
            openControlSidebar() {
                this.isControlSidebarOpen = true;
                document.body.classList.add('control-sidebar-slide-open');
            },
            closeControlSidebar() {
                if (this.userSettings.saving) {
                    return;
                }
                document.body.classList.remove('control-sidebar-slide-open');
                if ((this.userSettings.changed || this.localSettings.changed) && !this.userSettings.saving) {
                    this.appModals!.openSaveSettingsModal();
                }
                this.isControlSidebarOpen = false;
            },
            toggleUserSettings() {
                if (this.isControlSidebarOpen) {
                    this.closeControlSidebar();
                } else {
                    this.openControlSidebar();
                }
            },
            setDarkMode(value: boolean) {
                const hasDarkMode = document.body.classList.contains(DARK_MODE_CLASS);
                if (value && !hasDarkMode) {
                    document.body.classList.add(DARK_MODE_CLASS);
                } else if (!value && hasDarkMode) {
                    document.body.classList.remove(DARK_MODE_CLASS);
                }
            },
            async setLanguage(value: string) {
                if (value && this.$i18n.locale !== value) {
                    await this.$app.setLanguage(value);
                    await this.$app.cache.delete(window.schemaLoader.cacheKey);
                    await window.schemaLoader.loadSchema();
                }
            },
        },
    };
</script>

<style>
    .control-sidebar-enter,
    .control-sidebar-leave-to {
        right: -300px !important;
    }
    .control-sidebar-enter-to,
    .control-sidebar-leave {
        right: 0 !important;
    }
</style>
