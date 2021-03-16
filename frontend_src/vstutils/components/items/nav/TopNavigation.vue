<template>
    <nav class="main-header navbar navbar-expand bg-white navbar-light border-bottom">
        <ul class="navbar-nav">
            <li class="nav-item">
                <span
                    ref="sidebarControl"
                    class="nav-link sidebar-control"
                    data-widget="pushmenu"
                    @click="saveHideMenuSettings"
                >
                    <i class="fa fa-bars ico-data-default" />
                </span>
            </li>
            <template v-if="is_authenticated">
                <li class="nav-item for-web api-link">
                    <a :href="openapi_url" class="nav-link">
                        <i class="fa fa-star ico-data-default" />
                        <span class="text-data">API</span>
                    </a>
                </li>
            </template>
            <template v-else>
                <li class="nav-item for-web login-link">
                    <a class="nav-link" :href="login_url">
                        <i class="fas fa-sign-out-alt text-data" />
                        <span>{{ $t('login') | capitalize }}</span>
                    </a>
                </li>
            </template>
        </ul>

        <template v-if="is_authenticated">
            <ul class="navbar-nav ml-auto">
                <li class="nav-item dropdown">
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
                            {{ user.first_name | capitalize }}
                            {{ user.last_name | capitalize }}
                        </span>
                    </a>

                    <div
                        class="dropdown-menu dropdown-menu-xs dropdown-menu-right profile-menu background-default"
                    >
                        <component
                            :is="link_component"
                            :[link_attr]="profile_url"
                            class="dropdown-item text-data"
                        >
                            <i class="fa fa-id-card-o mr-2 ico-data-default" />
                            {{ $t('profile') | capitalize }}
                        </component>

                        <div class="dropdown-divider" />

                        <component
                            :is="link_component"
                            v-if="profile_settings_url"
                            :[link_attr]="profile_settings_url"
                            class="dropdown-item text-data"
                        >
                            <i class="fa fa-cogs mr-2 ico-data-default" />
                            {{ $t('settings') | capitalize }}
                        </component>

                        <div class="dropdown-divider for-web" />

                        <a :href="logout_url" class="dropdown-item for-web text-data">
                            <i class="fas fa-sign-out-alt mr-2 ico-data-default" />
                            {{ $t('logout') | capitalize }}
                        </a>
                    </div>
                </li>
                <li class="nav-item">
                    <span class="nav-link" data-widget="control-sidebar" data-slide="true">
                        <i class="fa fa-th-large ico-data-default" />
                    </span>
                </li>
            </ul>
        </template>
    </nav>
</template>

<script>
    import $ from 'jquery';
    import { Gravatar } from '../../../users';
    import { saveHideMenuSettings } from '../../../utils';

    /**
     * Component of top navigation menu.
     */
    export default {
        name: 'TopNav',
        props: {
            /**
             * Property, that means what type of links to use:
             *  - true - <a></a>,
             *  - false - <router-link></router-link>.
             */
            a_links: {
                default: false,
            },
        },
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
                let url = '/user/profile/';
                if (this.a_links) {
                    return this.$app.api.getHostUrl() + '/#' + url;
                }

                return url;
            },
            /**
             * Property, that returns URL to profile/settings page.
             */
            profile_settings_url() {
                const url = '/user/profile/settings/';

                if (!this.$app.views.get(url)) {
                    return;
                }

                if (this.a_links) {
                    return this.$app.api.getHostUrl() + '/#' + url;
                }

                return url;
            },
            /**
             * Property, that returns name of attribute for storing link url.
             */
            link_attr() {
                if (this.a_links) {
                    return 'href';
                }

                return 'to';
            },
            /**
             * Property, that returns name html tag for link.
             */
            link_component() {
                if (this.a_links) {
                    return 'a';
                }

                return 'router-link';
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
                return this.$app.config.schema.info['x-settings'].logout_url;
            },
            /**
             * Property, that returns login URL.
             */
            login_url() {
                return this.$app.config.schema.info['x-settings'].login_url;
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
        margin-top: 8px;
        border-radius: 0px;
        border-top: 0px;
        color: #fff;
        box-shadow: 0 0 0 0;
        border-color: #dfe3e7;
    }

    .sidebar-control {
        cursor: pointer;
    }
</style>
