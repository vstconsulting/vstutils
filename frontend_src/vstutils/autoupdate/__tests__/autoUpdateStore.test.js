import { expect, describe, test, beforeEach, jest } from '@jest/globals';
import { createPinia } from 'pinia';
import { useAutoUpdateStore } from '../autoUpdateStore.ts';

describe('autoUpdateStore', () => {
    let store;

    beforeEach(() => {
        store = useAutoUpdateStore(createPinia());
    });

    test('timer subscriptions', () => {
        const callback = jest.fn();
        expect(store.timerSubscribers.size).toBe(0);

        store.subscribe({
            id: '1',
            triggerType: 'timer',
            callback,
        });

        expect(store.timerSubscribers.size).toBe(1);
        store.timerSubscribers.get('1').callback();
        expect(callback).toBeCalledTimes(1);

        store.unsubscribe('1');

        expect(store.timerSubscribers.size).toBe(0);
    });

    test('centrifugo subscriptions', () => {
        const centrifugoSubscribers = store.centrifugoSubscribers;
        const centrifugoSubscriptions = store.centrifugoSubscriptions;

        const callback = jest.fn();

        expect(centrifugoSubscribers.size).toBe(0);

        store.subscribe({
            id: '1',
            triggerType: 'centrifugo',
            callback,
            labels: ['sub1', 'sub2'],
            pk: null,
        });

        expect(centrifugoSubscribers.size).toBe(1);
        expect(centrifugoSubscriptions.size).toBe(2);

        expect(centrifugoSubscriptions.get('sub1')).toStrictEqual([centrifugoSubscribers.get('1')]);
        centrifugoSubscribers.get('1').callback();
        expect(callback).toBeCalledTimes(1);

        store.unsubscribe('1');
        expect(centrifugoSubscriptions.size).toBe(0);
        expect(centrifugoSubscribers.size).toBe(0);
    });
});
