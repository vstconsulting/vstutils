<template>
    <div id="RealBody" style="display: none;" :class="classes">
        <div class="skin-black-light sidebar-mini">
            <div class="wrapper">
                <!-- Navbar -->
                <div id="top_nav_wrapper">
                    <TopNav :a_links="a_links" />
                </div>
                <!-- /Navbar -->

                <!-- Main Sidebar Container -->
                <div id="sidebar_wrapper">
                    <aside class="main-sidebar sidebar-dark-primary elevation-4">
                        <!-- Logo -->
                        <Logo :title="info.title" />
                        <!-- Logo -->

                        <!-- Sidebar -->
                        <Sidebar :menu="x_menu" :docs="x_docs" :a_links="a_links" />
                        <!-- /.Sidebar -->
                    </aside>
                </div>
                <!-- /Main Sidebar Container -->

                <!-- Content Wrapper. Contains page content -->
                <div class="content-wrapper">
                    <router-view></router-view>
                </div>
                <!-- /Content Wrapper. Contains page content -->

                <!-- Control Sidebar -->
                <div id="gui_customizer_wrapper">
                    <aside class="control-sidebar control-sidebar-dark guiCustomizer">
                        <GUICustomizer />
                    </aside>
                </div>
                <!-- /Control Sidebar -->

                <!-- Main Footer -->
                <div id="main_footer_wrapper">
                    <MainFooter />
                </div>
                <!-- /Main Footer -->
            </div>
        </div>
    </div>
</template>
<script>
    export default {
        name: 'AppRoot',
        props: ['info', 'x_menu', 'x_docs', 'a_links'],
        computed: {
            classes() {
                return ['is_superuser', 'is_staff'].filter((c) => window[c]);
            },
        },
    };
</script>
