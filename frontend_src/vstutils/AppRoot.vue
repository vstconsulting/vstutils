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
            <EntityView
                v-bind="entityViewProps"
                @execute-action="
                    (action) => $app.actions.execute({ action, instance: $app.store.page.instance })
                "
                @open-sublink="$u.openSublink($event, $app.store.page.instance)"
            >
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

        <ConfirmModal
            ref="saveSettingsModal"
            :message="$t('Do you want to save your changes? The page will be reloaded.')"
            :confirm-title="$t('Reload now')"
            :reject-title="$t('Cancel')"
            @confirm="saveSettings"
            @reject="rollbackSettings"
        />

        <ConfirmModal
            ref="confirmationModal"
            :message="`${$t('Confirm action')} ${confirmation.actionName}`"
            :confirm-title="$t('Confirm')"
            :reject-title="$t('Cancel')"
            @confirm="confirm"
            @reject="reject"
        />

        <component :is="c" v-for="(c, name) in additionalComponents" :ref="name" :key="name" />

        <portal-target name="root-bottom" multiple />
    </div>
</template>
<script>
    import ControlSidebar from './components/items/ControlSidebar.vue';
    import { Logo, MainFooter, Sidebar, TopNavigation, convertXMenuToSidebar } from './components/items';
    import ConfirmModal from './components/common/ConfirmModal';
    import EntityView from './components/common/EntityView.vue';

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
        },
        provide() {
            return {
                requestConfirmation: this.initConfirmation,
            };
        },
        props: {
            info: { type: Object, required: true },
            // eslint-disable-next-line vue/prop-name-casing
            x_menu: { type: Array, required: true },
            // eslint-disable-next-line vue/prop-name-casing
            x_docs: { type: Object, required: true },
        },
        data() {
            return {
                layoutClasses: ['sidebar-mini', 'layout-fixed', 'layout-footer-fixed'],
                confirmation: {
                    callback: null,
                    actionName: '',
                },
                isControlSidebarOpen: false,
                userSettings: this.$app.userSettingsStore,
                localSettings: this.$app.localSettingsStore,
            };
        },
        computed: {
            sidebarTopComponent() {
                return null;
            },
            sidebarBottomComponent() {
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
                        origin_link: true,
                    });
                }

                return menu;
            },
            entityViewProps() {
                const store = this.$app.store.page;

                if (store) {
                    return {
                        error: store.error,
                        loading: store.loading,
                        response: store.response,
                        view: store.view,
                        actions: store.actions,
                        sublinks: store.sublinks,
                    };
                }

                return {
                    error: null,
                    loading: false,
                    response: true,
                    view: null,
                    actions: [],
                    sublinks: [],
                };
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
                return ['is_superuser', 'is_staff'].filter((c) => window[c]);
            },
            bodyClasses() {
                return [...this.userPermissionClasses, ...this.layoutClasses];
            },
            classes() {
                return [];
            },
            additionalComponents() {
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
            updateBodyClass(newClass, oldClass) {
                if (oldClass) {
                    document.body.classList.remove(oldClass);
                }
                if (newClass) {
                    document.body.classList.add(newClass);
                }
            },
            initConfirmation(callback, actionName) {
                this.confirmation.callback = callback;
                this.confirmation.actionName = ` "${this.$t(actionName)}"?`;
                this.$refs.confirmationModal.openModal();
            },
            confirm() {
                this.confirmation.callback();
                this.confirmation.callback = null;
                this.$refs.confirmationModal.closeModal();
            },
            reject() {
                this.confirmation.callback = null;
                this.$refs.confirmationModal.closeModal();
                this.$refs.confirmationModal.$emit('closeCallback');
            },
            openControlSidebar() {
                this.isControlSidebarOpen = true;
                document.body.classList.add('control-sidebar-slide-open');
            },
            closeControlSidebar() {
                document.body.classList.remove('control-sidebar-slide-open');
                if (this.userSettings.changed || this.localSettings.changed) {
                    this.$refs.saveSettingsModal.openModal();
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
            setDarkMode(value) {
                const hasDarkMode = document.body.classList.contains(DARK_MODE_CLASS);
                if (value && !hasDarkMode) {
                    document.body.classList.add(DARK_MODE_CLASS);
                } else if (!value && hasDarkMode) {
                    document.body.classList.remove(DARK_MODE_CLASS);
                }
            },
            async setLanguage(value) {
                if (value && this.$i18n.locale !== value) {
                    await this.$app.setLanguage(value);
                    await this.$app.cache.delete(window.schemaLoader.cacheKey);
                    await window.schemaLoader.loadSchema();
                }
            },
            async saveSettings() {
                if (this.userSettings.changed) {
                    await this.userSettings.save();
                }
                if (this.localSettings.changed) {
                    await this.localSettings.save();
                }
                window.location.reload();
            },
            rollbackSettings() {
                this.$refs.saveSettingsModal.closeModal();
                this.userSettings.rollback();
                this.localSettings.rollback();
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
