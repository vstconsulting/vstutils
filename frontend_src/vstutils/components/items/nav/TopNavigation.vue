<template>
    <nav class="main-header navbar navbar-expand">
        <ul class="navbar-nav">
            <li class="nav-item">
                <a ref="sidebarControl" class="nav-link" data-widget="pushmenu" href="#" role="button">
                    <i class="fas fa-bars" />
                </a>
            </li>
        </ul>
        <ul class="navbar-nav">
            <li class="ml-2">
                <portal-target name="topNavigation" />
            </li>
        </ul>
        <ul class="navbar-nav ml-auto">
            <li v-if="is_authenticated" class="nav-item dropdown">
                <a class="nav-link" data-toggle="dropdown" href="#">
                    <template v-if="enableGravatar">
                        <img
                            :src="gravatarUrl"
                            class="img-circle elevation-1 gravatar-img"
                            alt="User gravatar"
                            @error="handleGravatarError"
                        />
                    </template>
                    <template v-else>
                        <i class="fa fa-user mr-2 ico-data-default" />
                    </template>
                    <span class="text-data hidden-480">
                        {{ user.given_name ? $u.capitalize(user.given_name) : '' }}
                        {{ user.family_name ? $u.capitalize(user.family_name) : '' }}
                    </span>
                </a>

                <div
                    class="dropdown-menu dropdown-menu-xs dropdown-menu-right profile-menu background-default"
                >
                    <router-link :to="profile_url" class="dropdown-item text-data">
                        <i class="fa fa-id-card-o mr-2 ico-data-default" />
                        {{ $u.capitalize($ts('profile')) }}
                    </router-link>
                    <div class="dropdown-divider" />

                    <template v-if="profile_settings_url">
                        <router-link :to="profile_settings_url" class="dropdown-item text-data">
                            >
                            <i class="fa fa-cogs mr-2 ico-data-default" />
                            {{ $u.capitalize($ts('settings')) }}
                        </router-link>
                        <div class="dropdown-divider" />
                    </template>

                    <button type="button" class="dropdown-item" @click="logout">
                        <i class="fas fa-sign-out-alt mr-2 ico-data-default" />
                        {{ $u.capitalize($ts('logout')) }}
                    </button>
                </div>
            </li>
            <li class="nav-item">
                <a class="nav-link" role="button" @click.stop="toggleControlSidebar">
                    <i class="fas fa-th-large" />
                </a>
            </li>
        </ul>
    </nav>
</template>

<script lang="ts">
    import $ from 'jquery';
    import { computed } from 'vue';
    import { useGravatarUrl } from '../../../users/Gravatar';
    import { getApp, saveHideMenuSettings } from '../../../utils';

    /**
     * Component of top navigation menu.
     */
    export default {
        name: 'TopNav',
        setup() {
            const app = getApp();

            const { gravatarUrl, handleGravatarError } = useGravatarUrl(() => app.userProfile.email);
            const enableGravatar = computed(() => {
                return app.schema.info['x-settings'].enable_gravatar;
            });

            return {
                user: app.userProfile,
                gravatarUrl,
                enableGravatar,
                handleGravatarError,
            };
        },
        computed: {
            /**
             * Boolean property, that returns true if user is authorized.
             */
            is_authenticated() {
                return Boolean(this.$app.api.getUserId());
            },
            /**
             * Property, that returns URL to profile page.
             */
            profile_url() {
                return '/user/profile/';
            },
            /**
             * Property, that returns URL to profile/settings page.
             */
            profile_settings_url() {
                const url = '/user/profile/settings/';

                if (!this.$app.views.get(url)) {
                    return;
                }

                return url;
            },
        },
        mounted() {
            // @ts-expect-error JQuery :(
            $(this.$refs.sidebarControl).PushMenu();
        },
        methods: {
            saveHideMenuSettings() {
                saveHideMenuSettings();
            },
            toggleControlSidebar() {
                // @ts-expect-error No types here
                this.$root.toggleUserSettings();
            },
            async logout() {
                await this.$app.config.logoutHandler({ config: this.$app.config });
            },
        },
    };
</script>

<style scoped>
    .gravatar-img {
        width: 30px;
        height: 30px;
        margin-top: -5px;
        margin-right: 5px;
    }

    .profile-menu {
        border-radius: 0px;
        border-top: 0px;
        color: #fff;
        box-shadow: 0 0 0 0;
        border-color: #dfe3e7;
    }
</style>
