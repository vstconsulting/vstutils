import { expect, test } from '@jest/globals';
import { createPinia } from 'pinia';
import { createLocalSettingsStore } from './../localSettingsStore.ts';

test('localSettings module', () => {
    const storage = window.sessionStorage;

    const store = createLocalSettingsStore(storage, 'test')(createPinia());

    storage.setItem('test', JSON.stringify({ val1: 1, val2: 2 }));

    store.load();
    expect(store.settings).toMatchObject({ val1: 1, val2: 2 });

    store.setValue({ key: 'val1', value: 'testValue' });
    expect(store.settings.val1).toBe('testValue');
    expect(store.changed).toBeTruthy();

    store.save();
    expect(storage.getItem('test')).toBe(JSON.stringify({ val1: 'testValue', val2: 2 }));
    expect(store.changed).toBeFalsy();

    store.setValue({ key: 'val1', value: 'other value' });
    store.rollback();
    expect(store.settings.val1).toBe('testValue');
});
