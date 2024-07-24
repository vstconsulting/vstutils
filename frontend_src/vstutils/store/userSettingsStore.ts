import { defineStore } from 'pinia';
import { signals } from '#vstutils/signals';
import { HttpMethods } from '#vstutils/utils';

import type { ApiConnector } from '#vstutils/api';
import type { ModelConstructor } from '#vstutils/models';
import type { InnerData } from '#vstutils/utils';
import type { SetFieldValueOptions } from '#vstutils/fields/base';
import { computed, readonly, ref } from 'vue';

type Section = Record<string, unknown>;
type Settings = Record<string, Section>;

const USER_SETTINGS_PATH = '/user/profile/_settings/';

export const createUserSettingsStore = (api: ApiConnector, modelClass: ModelConstructor) =>
    defineStore('userSettings', () => {
        const instance = ref(new modelClass());
        const settings = computed(() => instance.value.sandbox.value as Settings);
        const changed = computed(() => instance.value.sandbox.changed);
        const saving = ref(false);

        function setValue(section: string, { field, value, ...options }: SetFieldValueOptions) {
            const currentSectionValue: Record<string, unknown> =
                (instance.value.sandbox.value[section] as Record<string, unknown> | undefined) ?? {};
            instance.value.sandbox.set({
                field: section,
                value: { ...currentSectionValue, [field]: value },
                ...options,
            });
        }
        function rollback() {
            instance.value.sandbox.reset();
        }
        function setData(data: InnerData<Settings>) {
            instance.value = new modelClass(data);
        }
        async function save() {
            saving.value = true;
            instance.value._validateAndSetData();
            const dataToSave = instance.value._getInnerData();
            try {
                const { data } = await api.bulkQuery<InnerData<Settings>>({
                    method: HttpMethods.PUT,
                    path: USER_SETTINGS_PATH,
                    data: dataToSave,
                });
                setData(data);
            } finally {
                saving.value = false;
            }
        }
        function setAndSave(section: string, options: SetFieldValueOptions) {
            setValue(section, options);
            return save();
        }
        async function init() {
            const { data } = await api.makeRequest<InnerData<Settings>>({
                method: HttpMethods.GET,
                path: USER_SETTINGS_PATH,
                useBulk: true,
                auth: true,
            });
            signals.once('app.afterInit', () => {
                setData(data);
            });
        }

        return { settings, changed, saving: readonly(saving), init, setAndSave, save, rollback, setValue };
    });

export type UserSettingsStore = ReturnType<ReturnType<typeof createUserSettingsStore>>;
