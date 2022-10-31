import { defineStore } from 'pinia';
import { mergeDeep } from '../utils';

type Settings = Record<string, unknown>;
interface State {
    settings: Settings;
    originalSettings: Settings;
    changed: boolean;
}

export const createLocalSettingsStore = (storage: Storage, itemName: string) =>
    defineStore('localSettings', {
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
            setValue({ key, value }: { key: string; value: unknown }) {
                this.settings[key] = value;
                this.changed = true;
            },
            setOriginalSettings(settings: Settings) {
                this.originalSettings = mergeDeep({}, settings) as Settings;
            },
            rollback() {
                this.settings = mergeDeep({}, this.originalSettings) as Settings;
            },
            load() {
                const data = JSON.parse(storage.getItem(itemName) ?? '{}') as Settings;
                this.setSettings(data);
                this.setOriginalSettings(data);
            },
            save() {
                storage.setItem(itemName, JSON.stringify(this.settings));
                this.setSettings(this.settings);
                this.setOriginalSettings(this.settings);
            },
        },
    });

export type LocalSettingsStore = ReturnType<ReturnType<typeof createLocalSettingsStore>>;
