import { Model } from '@/vstutils/models';
import { signals } from '@/vstutils/signals';
import { defineStore } from 'pinia';
import type { ApiConnector } from '../api';
import { mergeDeep, HttpMethods } from './../utils';

type Section = Record<string, unknown>;
type Settings = Record<string, Section>;
interface State {
    instance: Model;
    settings: Settings;
    originalSettings: Settings;
    changed: boolean;
}

const USER_SETTINGS_PATH = '/user/profile/_settings/';

export const createUserSettingsStore = (api: ApiConnector, modelClass: typeof Model) =>
    defineStore('userSettings', {
        state: (): State => ({
            instance: new modelClass(),
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
            setData(data: Settings) {
                const instance = new modelClass(data);
                const representData = instance._getRepresentData() as Settings;
                this.setSettings(representData);
                this.setOriginalSettings(representData);
            },
            async load() {
                const { data } = await api.bulkQuery<Settings>({
                    method: HttpMethods.GET,
                    path: USER_SETTINGS_PATH,
                });
                this.setData(data);
            },
            async save() {
                this.instance._validateAndSetData(this.settings);
                const dataToSave = this.instance._getInnerData();
                const { data } = (await api.bulkQuery({
                    method: HttpMethods.PUT,
                    path: USER_SETTINGS_PATH,
                    data: dataToSave,
                })) as { data: Settings };
                this.setSettings(data);
            },
            setAndSave(obj: { section: string; key: string; value: unknown }) {
                this.setValue(obj);
                return this.save();
            },
            async init() {
                const { data } = await api.bulkQuery<Settings>({
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
