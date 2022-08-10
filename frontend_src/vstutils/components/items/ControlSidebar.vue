<template>
    <aside class="control-sidebar">
        <div class="p-3 control-sidebar-content">
            <div>
                <b>{{ $u.capitalize($tc('version', 1)) }}:</b>
                <code>{{ $app.config.projectVersion }}</code>
            </div>

            <component :is="btn.component" v-for="(btn, idx) in buttons" v-bind="btn.props" :key="idx" />

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
            <ConfirmModal
                ref="reloadPageModal"
                :message="'Changes in settings are successfully saved. Please refresh the page.'"
                :confirm-title="'Reload now'"
                :reject-title="'Later'"
                @confirm="reloadPage"
                @reject="close"
            />
            <button class="btn btn-secondary btn-block" @click="cleanAllCache">
                <i class="fas fa-sync-alt" />
                {{ `${$t('Reload')} ${$t('cache')}` }}
            </button>
        </div>
    </aside>
</template>

<script>
    import { HelpModal } from './modal';
    import ControlSidebarButton from './ControlSidebarButton.vue';
    import ConfirmModal from '../common/ConfirmModal';

    export default {
        name: 'ControlSidebar',
        components: { HelpModal, ConfirmModal },
        data() {
            return {
                isSaving: false,
            };
        },
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
            buttons() {
                return [
                    { component: HelpModal },
                    {
                        component: ControlSidebarButton,
                        props: {
                            href: this.$app.config.endpointUrl.href,
                            iconClass: 'fa fa-toolbox',
                            text: 'API',
                        },
                    },
                    ...this.additionalButtons,
                ];
            },
            additionalButtons() {
                return [];
            },
        },
        watch: {
            '$store.state.userSettings.changed': function () {
                this.isSaving = false;
            },
        },
        created() {
            this.UserSettings = this.$app.modelsResolver.byReferencePath('#/definitions/_UserSettings');
        },
        mounted() {
            document.addEventListener('keydown', this.closeControlSidebar);
            document.addEventListener('click', this.closeControlSidebar);
            document.addEventListener('scroll', this.closeControlSidebar);
        },
        beforeDestroy() {
            document.removeEventListener('keydown', this.closeControlSidebar);
            document.removeEventListener('click', this.closeControlSidebar);
            document.removeEventListener('scroll', this.closeControlSidebar);
        },
        methods: {
            async saveSettings() {
                this.isSaving = true;
                await this.$store.dispatch('userSettings/save');
                this.$refs.reloadPageModal.openModal();
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
            cleanAllCache() {
                window.cleanAllCacheAndReloadPage();
            },
            closeControlSidebar(ev) {
                if (ev.key === 'Escape') {
                    this.$root.closeControlSidebar();
                } else if (ev.type === 'click' && !this.$el.contains(ev.target)) {
                    this.$root.closeControlSidebar();
                } else if (ev.type === 'scroll' && document.body.getBoundingClientRect().top <= 0) {
                    this.$root.closeControlSidebar();
                }
            },
            close() {
                this.$refs.reloadPageModal.closeModal();
            },
        },
    };
</script>

<style scoped>
    .control-sidebar {
        width: 300px;
        color: #ffffff;
        background-color: #343a40;
        right: 0;
        z-index: 100;
    }
    .control-sidebar-content > * {
        margin-bottom: 8px;
    }
    .control-sidebar .field-component {
        max-width: 100%;
        flex: 0 0 100%;
    }
    ul.nav {
        margin-bottom: 1rem;
    }
    .control-sidebar {
        transition: right 0.3s ease-in-out;
    }
</style>

<style>
    .layout-fixed .control-sidebar {
        top: 47px !important;
        position: absolute !important;
    }
</style>
