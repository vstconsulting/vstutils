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

        <BootstrapModal ref="saveSettingsModal">
            <template #content>
                <div style="padding: 1rem">
                    <p>
                        {{ $t('Do you want to save your changes? The page will be reloaded.') }}
                    </p>
                    <button class="btn btn-success" @click="saveSettings">
                        {{ $t('Yes, reload now') }}
                    </button>
                    <button class="btn btn-secondary" style="float: right" @click="rollbackSettings">
                        {{ $u.capitalize($t('no')) }}
                    </button>
                </div>
            </template>
        </BootstrapModal>

        <transition name="fade">
            <div v-if="confirmation.isOpen" class="overlay" @click.stop="reject">
                <div class="card confirmation-modal" @click.stop>
                    <h5 class="card-title" style="text-align: center">
                        {{ $t('Confirm action') }}{{ confirmation.actionName }}
                    </h5>
                    <div class="mt-2">
                        <button class="btn btn btn-outline-success mr-1" @click="confirm">
                            {{ $t('Confirm') }}
                        </button>
                        <button class="btn btn btn-outline-danger" @click="reject">
                            {{ $t('Cancel') }}
                        </button>
                    </div>
                </div>
            </div>
        </transition>

        <portal-target name="root-bottom" multiple />
    </div>
</template>
<script>
    import { AutoUpdateController } from './autoupdate';
    import ControlSidebar from './components/items/ControlSidebar.vue';
    import { Logo, MainFooter, Sidebar, TopNavigation } from './components/items';
    import BootstrapModal from './components/BootstrapModal.vue';

    const DARK_MODE_CLASS = 'dark-mode';

    export default {
        name: 'AppRoot',
        components: { TopNavigation, ControlSidebar, MainFooter, Sidebar, Logo, BootstrapModal },
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
                    isOpen: false,
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
            $route() {
                this.reject();
            },
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
                this.reject();
            },
            initConfirmation(callback, actionName) {
                this.confirmation.callback = callback;
                this.confirmation.actionName = ` "${this.$t(actionName)}"?`;

                this.confirmation.isOpen = true;
            },
            confirm() {
                this.confirmation.isOpen = false;
                this.confirmation.callback();
                this.confirmation.callback = null;
            },
            reject() {
                this.confirmation.isOpen = false;
                this.confirmation.callback = null;
            },
            openControlSidebar() {
                this.isControlSidebarOpen = true;
                document.body.classList.add('control-sidebar-slide-open');
            },
            closeControlSidebar() {
                document.body.classList.remove('control-sidebar-slide-open');
                if (this.$store.state.userSettings.changed) {
                    this.$refs.saveSettingsModal.open();
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
                this.$refs.saveSettingsModal.close();
                this.$store.commit('userSettings/rollback');
            },
        },
    };
</script>
<style scoped>
    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2000;
        background-color: rgba(0, 0, 0, 0.2);
    }
    .confirmation-modal {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        margin: 30px auto 0;
        width: 300px;
        min-height: 100px;
    }
</style>

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
