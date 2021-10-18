<template>
    <aside class="control-sidebar control-sidebar-dark">
        <div class="p-3 control-sidebar-content">
            <div>
                <b>{{ $u.capitalize($tc('version', 1)) }}:</b>
                <code>{{ $app.config.projectVersion }}</code>
            </div>

            <HelpModal />

            <a class="btn btn-secondary btn-block" :href="$app.config.endpointUrl.href" role="button">
                <i class="fa fa-toolbox" />
                API
            </a>

            <template v-for="(section, idx) in sections">
                <h6 :key="`section-${idx}`">
                    {{ $t(section.title) }}
                </h6>
                <component
                    :is="field.component"
                    v-for="field in section.fields"
                    :key="field.name"
                    :field="field"
                    :data="$store.state.userSettings.settings[section.name]"
                    type="edit"
                    @set-value="setUserSetting(section.name, field, $event.value)"
                />
            </template>
            <button
                class="btn btn-success btn-block"
                :disabled="!$store.state.userSettings.changed || isSaving"
                @click="saveSettings"
            >
                <i class="fas fa-save" />
                {{ $t('Save') }}
            </button>
            <BootstrapModal ref="reloadPageModal">
                <template #content="{ closeModal }">
                    <div style="padding: 1rem">
                        <p>
                            {{ $t('Changes in settings are successfully saved. Please refresh the page.') }}
                        </p>
                        <button class="btn btn-success" @click="reloadPage">
                            {{ `${$t('Reload')} ${$t('now')}` }}
                        </button>
                        <button class="btn btn-secondary" style="float: right" @click="closeModal">
                            {{ $u.capitalize($t('later')) }}
                        </button>
                    </div>
                </template>
            </BootstrapModal>

            <button class="btn btn-secondary btn-block" @click="cleanAllCache">
                <i class="fas fa-sync-alt" />
                {{ `${$t('Reload')} ${$t('cache')}` }}
            </button>
        </div>
    </aside>
</template>

<script>
    import { HelpModal } from './modal';
    import BootstrapModal from '../BootstrapModal.vue';

    const DARK_MODE_CLASS = 'dark-mode';

    export default {
        name: 'ControlSidebar',
        components: { BootstrapModal, HelpModal },
        data: () => ({
            isSaving: false,
        }),
        computed: {
            sections() {
                const sectionsFields = Array.from(this.UserSettings.fields.values()).filter(
                    (f) => f.nestedModel,
                );

                return sectionsFields
                    .filter((field) => this.$store.state.userSettings.settings[field.name])
                    .map((field) => ({
                        name: field.name,
                        title: field.title,
                        fields: Array.from(field.nestedModel.fields.values()),
                    }));
            },
        },
        watch: {
            '$store.state.userSettings.changed': function () {
                this.isSaving = false;
            },
            '$store.state.userSettings.settings.main.language': 'setLanguage',
            '$store.state.userSettings.settings.main.dark_mode': 'setDarkMode',
        },
        created() {
            this.UserSettings = this.$app.modelsResolver.byReferencePath('#/definitions/_UserSettings');
        },
        methods: {
            async saveSettings() {
                this.isSaving = true;
                await this.$store.dispatch('userSettings/save');
                this.$refs.reloadPageModal.open();
            },
            reloadPage() {
                window.location.reload();
            },
            setUserSetting(section, field, value) {
                this.$store.commit('userSettings/setValue', {
                    section,
                    key: field.name,
                    value: field.toInner({ [field.name]: value }),
                });
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
            cleanAllCache() {
                window.cleanAllCacheAndReloadPage();
            },
        },
    };
</script>

<style scoped>
    .control-sidebar .field-component {
        max-width: 100%;
        flex: 0 0 100%;
    }
    .control-sidebar-content::v-deep > * {
        margin-bottom: 10px;
    }
    ul.nav {
        margin-bottom: 1rem;
    }
</style>
