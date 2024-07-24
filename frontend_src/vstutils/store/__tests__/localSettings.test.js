import { makeModel, BaseModel } from '#vstutils/models';
import { StringField } from '#vstutils/fields/text';
import { IntegerField } from '#vstutils/fields/numbers/integer';
import { createPinia } from 'pinia';
import { createLocalSettingsStore } from './../localSettingsStore.ts';

test('localSettings module', () => {
    const storage = window.sessionStorage;

    const Settings = makeModel(
        class extends BaseModel {
            static declaredFields = [
                new StringField({ name: 'val1', required: false, type: 'string' }),
                new IntegerField({ format: 'integer', name: 'val2', required: false, type: 'number' }),
            ];
        },
        'Settings',
    );

    const store = createLocalSettingsStore(storage, 'test', Settings)(createPinia());

    storage.setItem('test', JSON.stringify({ val1: 1, val2: 2 }));

    store.load();
    expect(store.settings).toMatchObject({ val1: 1, val2: 2 });

    store.setValue({ field: 'val1', value: 'testValue' });
    expect(store.settings.val1).toBe('testValue');
    expect(store.changed).toBeTruthy();

    store.save();
    expect(storage.getItem('test')).toBe(JSON.stringify({ val1: 'testValue', val2: 2 }));
    expect(store.changed).toBeFalsy();

    store.setValue({ key: 'val1', value: 'other value' });
    store.rollback();
    expect(store.settings.val1).toBe('testValue');
});
