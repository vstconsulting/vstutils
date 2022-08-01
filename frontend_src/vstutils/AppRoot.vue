<template>
    <div id="RealBody" class="wrapper" :class="classes">
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

        <portal-target name="root-bottom" multiple />
    </div>
</template>
<script>
    import { AutoUpdateController } from './autoupdate';
    import ControlSidebar from './components/items/ControlSidebar.vue';
    import { Logo, MainFooter, Sidebar, TopNavigation } from './components/items';
    import ConfirmModal from './components/common/ConfirmModal';

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
        },
        mixins: [AutoUpdateController],
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
            };
        },
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
            '$store.state.userSettings.settings.main.language': { handler: 'setLanguage', immediate: true },
            '$store.state.userSettings.settings.main.dark_mode': { handler: 'setDarkMode', immediate: true },
        },
        created() {
            document.body.classList.add(...this.bodyClasses);
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
                if (this.$store.state.userSettings.changed) {
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
                if (this.$i18n.locale !== value) {
                    await this.$app.setLanguage(value);
                    await this.$app.cache.delete(window.schemaLoader.cacheKey);
                    await window.schemaLoader.loadSchema();
                }
            },
            async saveSettings() {
                await this.$store.dispatch('userSettings/save');
                window.location.reload();
            },
            rollbackSettings() {
                this.$refs.saveSettingsModal.closeModal();
                this.$store.commit('userSettings/rollback');
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
