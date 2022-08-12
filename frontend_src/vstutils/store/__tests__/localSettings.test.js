import { expect, test } from '@jest/globals';
import Vuex from 'vuex';
import { localSettingsModule } from '../index.js';

test('localSettings module', () => {
    const storage = window.sessionStorage;
    const store = new Vuex.Store({
        modules: {
            localSettings: localSettingsModule(storage, 'test'),
        },
    });

    storage.setItem('test', JSON.stringify({ val1: 1, val2: 2 }));

    store.dispatch('localSettings/load');
    expect(store.state.localSettings.settings).toMatchObject({ val1: 1, val2: 2 });

    store.commit('localSettings/setValue', { key: 'val1', value: 'testValue' });
    expect(store.state.localSettings.settings.val1).toBe('testValue');
    expect(store.state.localSettings.changed).toBeTruthy();

    store.dispatch('localSettings/save');
    expect(storage.getItem('test')).toBe(JSON.stringify({ val1: 'testValue', val2: 2 }));
    expect(store.state.localSettings.changed).toBeFalsy();

    store.commit('localSettings/setValue', { key: 'val1', value: 'other value' });
    store.commit('localSettings/rollback');
    expect(store.state.localSettings.settings.val1).toBe('testValue');
});
