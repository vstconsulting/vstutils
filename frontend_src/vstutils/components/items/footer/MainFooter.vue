<template>
    <footer class="main-footer">
        <div class="footer-section">
            <HelpModal />

            <slot name="footer_buttons" />

            <div class="d-none d-sm-block" style="margin-right: 0px">
                <b>{{ $tc('version', 1) | capitalize }}</b>
                {{ $app.config.projectVersion }}
            </div>
        </div>

        <div class="footer-section">
            <a href="#" class="help-text-data" onclick="cleanAllCacheAndReloadPage(); return false;">
                {{ ($t('reload') + ' ' + $t('cache')) | capitalize }}
            </a>
        </div>
    </footer>
</template>

<script>
    import HelpModal from '../modal/HelpModal.vue';
    export default {
        name: 'MainFooter',
        components: { HelpModal },
    };
</script>

<style scoped></style>
