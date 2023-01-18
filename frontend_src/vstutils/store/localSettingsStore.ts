import { ref } from 'vue';
import { defineStore } from 'pinia';
import { emptyRepresentData, mergeDeep } from '@/vstutils/utils';
import type { Model } from '@/vstutils/models';
import type { SetFieldValueOptions } from '@/vstutils/fields/base';
import type { InnerData, RepresentData } from '@/vstutils/utils';

type Settings = Record<string, unknown>;

export const createLocalSettingsStore = (storage: Storage, itemName: string, modelClass: typeof Model) =>
    defineStore('localSettings', () => {
        const instance = new modelClass();
        const settings = ref(emptyRepresentData<Settings>());
        const originalSettings = ref(emptyRepresentData<Settings>());
        const changed = ref(false);

        function setSettings(newSettings: RepresentData<Settings>) {
            settings.value = newSettings;
            changed.value = false;
        }
        function setValue({ field, value, markChanged = true }: SetFieldValueOptions) {
            settings.value[field] = value;
            if (markChanged) {
                changed.value = true;
            }
        }
        function setOriginalSettings(settings: RepresentData<Settings>) {
            originalSettings.value = mergeDeep({}, settings) as RepresentData<Settings>;
        }
        function rollback() {
            settings.value = mergeDeep({}, originalSettings.value) as RepresentData<Settings>;
            changed.value = false;
        }
        function load() {
            const instance = new modelClass(
                JSON.parse(storage.getItem(itemName) ?? '{}') as InnerData<Settings>,
            );
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
