import { defineStore } from 'pinia';
import type { ApiConnector } from '../api';
import { mergeDeep, HttpMethods } from './../utils';

type Section = Record<string, unknown>;
type Settings = Record<string, Section>;
interface State {
    settings: Settings;
    originalSettings: Settings;
    changed: boolean;
}

const USER_SETTINGS_PATH = '/user/profile/_settings/';

export const createUserSettingsStore = (api: ApiConnector) =>
    defineStore('userSettings', {
        state: (): State => ({
            settings: {},
            originalSettings: {},
            changed: false,
        }),
        actions: {
            setSettings(settings: Settings) {
                this.settings = settings;
                this.changed = false;
            },
            setValue({ section, key, value }: { section: string; key: string; value: unknown }) {
                this.settings[section][key] = value;
                this.changed = true;
            },
            setOriginalSettings(settings: Settings) {
                this.originalSettings = mergeDeep({}, settings) as Settings;
            },
            rollback() {
                this.settings = mergeDeep({}, this.originalSettings) as Settings;
            },

            async load() {
                const { data } = (await api.bulkQuery({
                    method: HttpMethods.GET,
                    path: USER_SETTINGS_PATH,
                })) as { data: Settings };
                this.setSettings(data);
                this.setOriginalSettings(data);
            },
            async save() {
                const { data } = (await api.bulkQuery({
                    method: HttpMethods.PUT,
                    path: USER_SETTINGS_PATH,
                    data: this.settings,
                })) as { data: Settings };
                this.setSettings(data);
            },
            setAndSave(obj: { section: string; key: string; value: unknown }) {
                this.setValue(obj);
                return this.save();
            },
        },
    });

export type UserSettingsStore = ReturnType<ReturnType<typeof createUserSettingsStore>>;
