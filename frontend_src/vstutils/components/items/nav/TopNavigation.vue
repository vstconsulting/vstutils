<template>
    <nav class="main-header navbar navbar-expand bg-white navbar-light border-bottom">
        <ul class="navbar-nav">
            <li class="nav-item">
                <a ref="sidebarControl" class="nav-link" data-widget="pushmenu" href="#" role="button">
                    <i class="fas fa-bars" />
                </a>
            </li>
        </ul>

        <ul class="navbar-nav ml-auto">
            <li v-if="is_authenticated" class="nav-item dropdown">
                <a class="nav-link" data-toggle="dropdown" href="#">
                    <template v-if="enable_gravatar">
                        <img
                            :src="gravatar_img"
                            class="img-circle elevation-1 gravatar-img"
                            alt="User gravatar"
                            @error="setDefaultGravatar($event.target)"
                        />
                    </template>
                    <template v-else>
                        <i class="fa fa-user mr-2 ico-data-default" />
                    </template>
                    <span class="text-data hidden-480">
                        {{ $u.capitalize(user.first_name) }}
                        {{ $u.capitalize(user.last_name) }}
                    </span>
                </a>

                <div
                    class="dropdown-menu dropdown-menu-xs dropdown-menu-right profile-menu background-default"
                >
                    <router-link :to="profile_url" class="dropdown-item text-data">
                        <i class="fa fa-id-card-o mr-2 ico-data-default" />
                        {{ $u.capitalize($t('profile')) }}
                    </router-link>

                    <div class="dropdown-divider" />

                    <router-link
                        v-if="profile_settings_url"
                        :to="profile_settings_url"
                        class="dropdown-item text-data"
                    >
                        <i class="fa fa-cogs mr-2 ico-data-default" />
                        {{ $u.capitalize($t('settings')) }}
                    </router-link>

                    <div class="dropdown-divider for-web" />

                    <a :href="logout_url" class="dropdown-item for-web text-data">
                        <i class="fas fa-sign-out-alt mr-2 ico-data-default" />
                        {{ $u.capitalize($t('logout')) }}
                    </a>
                </div>
            </li>
            <li v-else class="nav-item">
                <a class="nav-link" :href="login_url">
                    <i class="fas fa-sign-out-alt text-data" />
                    <span>{{ $u.capitalize($t('login')) }}</span>
                </a>
            </li>
            <li class="nav-item">
                <a
                    class="nav-link"
                    data-widget="control-sidebar"
                    data-slide="true"
                    href="#"
                    role="button"
                    @click="toggleUserSettings"
                >
                    <i class="fas fa-th-large" />
                </a>
            </li>
        </ul>
    </nav>
</template>

<script>
    import $ from 'jquery';
    import Gravatar from '../../../users/Gravatar.js';
    import { saveHideMenuSettings } from '../../../utils';

    /**
     * Component of top navigation menu.
     */
    export default {
        name: 'TopNav',
        data() {
            return {
                gravatar: new Gravatar(),
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
             * Boolean property, that returns true if gravatar_mode is activated.
             */
            enable_gravatar() {
                return this.$app.api.openapi.info['x-settings'].enable_gravatar;
            },
            /**
             * Property, that returns object with properties of current application user.
             */
            user() {
                return this.$app.user;
            },
            /**
             * Property, that returns URL to user's gravatar.
             */
            gravatar_img() {
                return this.gravatar.getGravatarByEmail(this.user.email);
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
            /**
             * Property, that returns URL to openapi.
             */
            openapi_url() {
                return window.openapi_path;
            },
            /**
             * Property, that returns logout URL.
             */
            logout_url() {
                return this.$app.config.urls.logout;
            },
            /**
             * Property, that returns login URL.
             */
            login_url() {
                return this.$app.config.urls.login;
            },
        },
        mounted() {
            $(this.$refs.sidebarControl).PushMenu();
        },
        methods: {
            saveHideMenuSettings() {
                saveHideMenuSettings();
            },
            /**
             * Method, that returns URL to default gravatar img.
             */
            getDefaultGravatarImg() {
                return this.gravatar.getDefaultGravatar();
            },
            /**
             * Method, that sets default gravatar img to some <img>.
             * @param {object} el DOM img element.
             */
            setDefaultGravatar(el) {
                el.src = this.getDefaultGravatarImg();
                return false;
            },
            toggleUserSettings() {
                if (
                    document.body.classList.contains('control-sidebar-slide-open') &&
                    this.$store.state.userSettings.changed
                ) {
                    this.$store.dispatch('userSettings/save');
                }
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
