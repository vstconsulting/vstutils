import { ref } from 'vue';
import { defineStore } from 'pinia';
import { mergeDeep } from '@/vstutils/utils';
import type { Model } from '@/vstutils/models';

type Settings = Record<string, unknown>;

export const createLocalSettingsStore = (storage: Storage, itemName: string, modelClass: typeof Model) =>
    defineStore('localSettings', () => {
        const instance = new modelClass();
        const settings = ref<Settings>({});
        const originalSettings = ref<Settings>({});
        const changed = ref(false);

        function setSettings(newSettings: Settings) {
            settings.value = newSettings;
            changed.value = false;
        }
        function setValue({ key, value }: { key: string; value: unknown }) {
            settings.value[key] = value;
            changed.value = true;
        }
        function setOriginalSettings(settings: Settings) {
            originalSettings.value = mergeDeep({}, settings) as Settings;
        }
        function rollback() {
            settings.value = mergeDeep({}, originalSettings.value) as Settings;
        }
        function load() {
            const instance = new modelClass(JSON.parse(storage.getItem(itemName) ?? '{}') as Settings);
            const data = instance._getRepresentData();
            setSettings(data);
            setOriginalSettings(data);
        }
        function save() {
            instance._validateAndSetData(settings.value);
            storage.setItem(itemName, JSON.stringify(instance._getInnerData()));
            setSettings(settings.value);
            setOriginalSettings(settings.value);
        }

        return {
            settings,
            originalSettings,
            changed,
            setSettings,
            setValue,
            setOriginalSettings,
            rollback,
            load,
            save,
        };
    });

export type LocalSettingsStore = ReturnType<ReturnType<typeof createLocalSettingsStore>>;
