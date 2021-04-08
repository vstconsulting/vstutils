<template>
    <aside class="control-sidebar control-sidebar-dark">
        <div class="p-3 control-sidebar-content">
            <div>
                <b>{{ $tc('version', 1) | capitalize }}:</b>
                <code>{{ $app.config.projectVersion }}</code>
            </div>

            <HelpModal />

            <a class="btn btn-secondary btn-block" :href="$app.config.endpointUrl.href" role="button">
                <i class="fa fa-toolbox" />
                API
            </a>

            <template v-for="(section, idx) in sections">
                <h6 :key="`section-${idx}`">
                    {{ section.title }}
                </h6>
                <component
                    :is="field.component"
                    v-for="field in section.fields"
                    :key="field.name"
                    :field="field"
                    :data="$store.state.userSettings.settings[section.name]"
                    type="edit"
                    @set-value="setUserSetting(section.name, field.name, $event.value)"
                />
            </template>

            <button class="btn btn-secondary btn-block" @click="cleanAllCache">
                <i class="fas fa-sync-alt" />
                {{ ($t('reload') + ' ' + $t('cache')) | capitalize }}
            </button>
        </div>
    </aside>
</template>

<script>
    import { HelpModal } from './modal';

    const DARK_MODE_CLASS = 'dark-mode';

    export default {
        name: 'ControlSidebar',
        components: { HelpModal },
        computed: {
            sections() {
                const UserSettings = this.$app.modelsClasses.get('_UserSettings');
                const sectionsFields = Array.from(UserSettings.fields.values()).filter((f) => f.nestedModel);

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
            '$store.state.userSettings.settings.main.language': 'setLanguage',
            '$store.state.userSettings.settings.main.dark_mode': 'setDarkMode',
        },
        created() {
            this.$store.dispatch('userSettings/load');
        },
        methods: {
            setUserSetting(section, key, value) {
                this.$store.commit('userSettings/setValue', { section, key, value });
            },
            setDarkMode(value) {
                const hasDarkMode = document.body.classList.contains(DARK_MODE_CLASS);
                if (value && !hasDarkMode) {
                    document.body.classList.add(DARK_MODE_CLASS);
                } else if (!value && hasDarkMode) {
                    document.body.classList.remove(DARK_MODE_CLASS);
                }
            },
            setLanguage(value) {
                this.$app.setLanguage(value);
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
