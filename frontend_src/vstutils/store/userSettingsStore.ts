import { defineStore } from 'pinia';
import { signals } from '@/vstutils/signals';
import { emptyRepresentData, HttpMethods, mergeDeep } from '@/vstutils/utils';

import type { ApiConnector } from '@/vstutils/api';
import type { Model } from '@/vstutils/models';
import type { InnerData, RepresentData } from '@/vstutils/utils';
import type { SetFieldValueOptions } from '@/vstutils/fields/base';

type Section = Record<string, unknown>;
type Settings = Record<string, Section>;
interface State {
    instance: Model;
    settings: RepresentData<Settings>;
    originalSettings: Settings;
    changed: boolean;
}

const USER_SETTINGS_PATH = '/user/profile/_settings/';

export const createUserSettingsStore = (api: ApiConnector, modelClass: typeof Model) =>
    defineStore('userSettings', {
        state: (): State => ({
            instance: new modelClass(),
            settings: emptyRepresentData<Settings>(),
            originalSettings: emptyRepresentData<Settings>(),
            changed: false,
        }),
        actions: {
            setSettings(settings: RepresentData<Settings>) {
                this.settings = settings;
                this.changed = false;
            },
            setValue(section: string, { field, value, markChanged = true }: SetFieldValueOptions) {
                this.settings[section][field] = value;
                if (markChanged) {
                    this.changed = true;
                }
            },
            setOriginalSettings(settings: Settings) {
                this.originalSettings = mergeDeep({}, settings) as Settings;
            },
            rollback() {
                this.settings = mergeDeep({}, this.originalSettings) as RepresentData<Settings>;
                this.changed = false;
            },
            setData(data: InnerData<Settings>) {
                const instance = new modelClass(data);
                const representData = instance._getRepresentData() as RepresentData<Settings>;
                this.setSettings(representData);
                this.setOriginalSettings(representData);
            },
            async load() {
                const { data } = await api.bulkQuery<InnerData<Settings>>({
                    method: HttpMethods.GET,
                    path: USER_SETTINGS_PATH,
                });
                this.setData(data);
            },
            async save() {
                this.instance._validateAndSetData(this.settings);
                const dataToSave = this.instance._getInnerData();
                const { data } = await api.bulkQuery<InnerData<Settings>>({
                    method: HttpMethods.PUT,
                    path: USER_SETTINGS_PATH,
                    data: dataToSave,
                });
                this.setData(data);
            },
            setAndSave(section: string, options: { field: string; value: unknown; markChanged: boolean }) {
                this.setValue(section, options);
                return this.save();
            },
            async init() {
                const { data } = await api.bulkQuery<InnerData<Settings>>({
                    method: HttpMethods.GET,
                    path: USER_SETTINGS_PATH,
                });
                signals.once('app.afterInit', () => {
                    this.setData(data);
                });
            },
        },
    });

export type UserSettingsStore = ReturnType<ReturnType<typeof createUserSettingsStore>>;
