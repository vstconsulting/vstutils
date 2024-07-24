import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Model, ModelConstructor } from '#vstutils/models';
import type { SetFieldValueOptions } from '#vstutils/fields/base';
import type { InnerData } from '#vstutils/utils';

type Settings = Record<string, unknown>;

export const createLocalSettingsStore = (storage: Storage, itemName: string, modelClass: ModelConstructor) =>
    defineStore('localSettings', () => {
        const instance = ref<Model>(new modelClass());
        const settings = computed(() => instance.value.sandbox.value);
        const changed = computed(() => instance.value.sandbox.changed);

        function setValue(options: SetFieldValueOptions) {
            instance.value.sandbox.set(options);
        }
        function rollback() {
            instance.value.sandbox.reset();
        }
        function load() {
            instance.value = new modelClass(
                JSON.parse(storage.getItem(itemName) ?? '{}') as InnerData<Settings>,
            );
        }
        function save() {
            instance.value._validateAndSetData();
            storage.setItem(itemName, JSON.stringify(instance.value._getInnerData()));
            load();
        }

        return {
            settings,
            changed,
            setValue,
            rollback,
            load,
            save,
        };
    });

export type LocalSettingsStore = ReturnType<ReturnType<typeof createLocalSettingsStore>>;
