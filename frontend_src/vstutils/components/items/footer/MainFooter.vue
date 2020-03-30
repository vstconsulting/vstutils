<template>
    <footer class="main-footer">
        <div class="footer-section">
            <gui_help_modal></gui_help_modal>

            <slot name="footer_buttons"></slot>

            <div class="d-none d-sm-block" style="margin-right: 0px;">
                <b>{{ $tc('version', 1) | capitalize }}</b>
                {{ project_version }}
            </div>
        </div>

        <div class="footer-section">
            <template v-if="is_debug">
                <b>
                    <a href="#" class="help-text-data" onclick="loadQUnitTests(); return false;">
                        Test qUnit
                    </a>
                </b>
            </template>

            <a href="#" class="help-text-data" onclick="cleanAllCacheAndReloadPage(); return false;">
                {{ ($t('reload') + ' ' + $t('cache')) | capitalize }}
            </a>
        </div>
        <!-- <br> -->
    </footer>
</template>

<script>
    export default {
        name: 'main_footer',
        computed: {
            /**
             * Property, that returns project version.
             */
            project_version() {
                return app.api.openapi.info['x-versions'].application;
            },
            /**
             * Boolean property, that means: debug mode is enable or not.
             */
            is_debug() {
                return window.isDebug;
            },
        },
    };
</script>

<style scoped></style>
