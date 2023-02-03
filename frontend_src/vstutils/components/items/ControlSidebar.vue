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
                    :is="field.getComponent()"
                    v-for="field in section.fields"
                    :key="field.name"
                    :field="field"
                    :data="userSettings.settings[section.name]"
                    type="edit"
                    @set-value="setUserSetting(section.name, $event)"
                />
            </template>
            <component
                :is="field.getComponent()"
                v-for="field in localSettingsFields"
                :key="field.name"
                :field="field"
                :data="localSettings.settings"
                type="edit"
                @set-value="setLocalSetting"
            />
            <button class="btn btn-success btn-block" :disabled="disableSaveButton" @click="saveSettings">
                <i class="fas fa-save" />
                {{ $t('Save') }}
            </button>
            <ConfirmModal
                ref="reloadPageModal"
                message="Changes in settings are successfully saved. Please refresh the page."
                confirm-title="Reload now"
                reject-title="Later"
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

<script lang="ts">
    import { ref } from 'vue';
    import { HelpModal } from './modal';
    import ControlSidebarButton from './ControlSidebarButton.vue';
    import ConfirmModal from '../common/ConfirmModal.vue';
    import type { Field, SetFieldValueOptions } from '@/vstutils/fields/base';
    import type { NestedObjectField } from '@/vstutils/fields/nested-object';
    import type AppRoot from '@/vstutils/AppRoot.vue';

    type AppRootEl = InstanceType<typeof AppRoot>;

    export default {
        name: 'ControlSidebar',
        components: { HelpModal, ConfirmModal },
        setup() {
            const reloadPageModal = ref<InstanceType<typeof ConfirmModal>>();

            return {
                reloadPageModal,
            };
        },
        data() {
            return {
                isSaving: false,
                UserSettings: this.$app.modelsResolver.byReferencePath('#/definitions/_UserSettings'),

                localSettings: this.$app.localSettingsStore,
                userSettings: this.$app.userSettingsStore,
            };
        },
        computed: {
            disableSaveButton() {
                return (!this.userSettings.changed && !this.localSettings.changed) || this.isSaving;
            },
            localSettingsFields() {
                return Array.from(this.$app.localSettingsModel.fields.values());
            },
            sections() {
                const sectionsFields = Array.from(this.UserSettings.fields.values()).filter(
                    (f: Field | NestedObjectField): f is NestedObjectField =>
                        'nestedModel' in f && f.nestedModel !== undefined,
                );

                return sectionsFields
                    .filter((field) => this.userSettings.settings[field.name])
                    .map((field) => ({
                        name: field.name,
                        title: field.title,
                        fields: Array.from(field.nestedModel!.fields.values()),
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
            'userSettings.changed': function () {
                this.isSaving = false;
            },
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
                if (this.userSettings.changed) {
                    this.isSaving = true;
                    await this.userSettings.save();
                }
                if (this.localSettings.changed) {
                    this.localSettings.save();
                }
                this.reloadPageModal!.openModal();
            },
            reloadPage() {
                window.location.reload();
            },
            setUserSetting(section: string, options: SetFieldValueOptions) {
                this.userSettings.setValue(section, options);
            },
            setLocalSetting(options: SetFieldValueOptions) {
                this.localSettings.setValue(options);
            },
            cleanAllCache() {
                window.cleanAllCacheAndReloadPage();
            },
            closeControlSidebar(ev: Event) {
                if ((ev as KeyboardEvent).key === 'Escape') {
                    (this.$root as AppRootEl).closeControlSidebar();
                } else if (ev.type === 'click' && !this.$el.contains(ev.target as HTMLElement)) {
                    (this.$root as AppRootEl).closeControlSidebar();
                } else if (ev.type === 'scroll' && document.body.getBoundingClientRect().top <= 0) {
                    (this.$root as AppRootEl).closeControlSidebar();
                }
            },
            close() {
                this.reloadPageModal!.closeModal();
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
