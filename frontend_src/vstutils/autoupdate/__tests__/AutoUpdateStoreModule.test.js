import { expect, describe, test, beforeAll, beforeEach, jest } from '@jest/globals';
import Vuex from 'vuex';
import AutoUpdateStoreModule from '../AutoUpdateStoreModule.js';
import { createLocalVue } from '@vue/test-utils';

describe('AutoUpdateStoreModule', () => {
    let Vue;
    let store;

    beforeAll(() => {
        Vue = createLocalVue();
        Vue.use(Vuex);
    });

    beforeEach(() => {
        store = new Vuex.Store({
            modules: { autoupdate: AutoUpdateStoreModule },
        });
    });

    test('timer subscriptions', () => {
        const callback = jest.fn();
        expect(store.state.autoupdate.timerSubscribers.size).toBe(0);

        store.commit('autoupdate/subscribe', {
            autoupdateId: '1',
            type: 'function',
            triggerType: 'timer',
            value: callback,
        });

        expect(store.state.autoupdate.timerSubscribers.size).toBe(1);
        store.state.autoupdate.timerSubscribers.get('1').value();
        expect(callback).toBeCalledTimes(1);

        store.commit('autoupdate/unsubscribe', '1');

        expect(store.state.autoupdate.timerSubscribers.size).toBe(0);
    });

    test('centrifugo subscriptions', () => {
        const centrifugoSubscribers = store.state.autoupdate.centrifugoSubscribers;
        const centrifugoSubscriptions = store.state.autoupdate.centrifugoSubscriptions;

        const callback = jest.fn();

        expect(centrifugoSubscribers.size).toBe(0);

        store.commit('autoupdate/subscribe', {
            autoupdateId: '1',
            type: 'function',
            triggerType: 'centrifugo',
            value: callback,
            subscriptions: ['sub1', 'sub2'],
            pk: null,
        });

        expect(centrifugoSubscribers.size).toBe(1);
        expect(centrifugoSubscriptions.size).toBe(2);

        expect(centrifugoSubscriptions.get('sub1')).toStrictEqual([centrifugoSubscribers.get('1')]);
        centrifugoSubscribers.get('1').value();
        expect(callback).toBeCalledTimes(1);

        store.commit('autoupdate/unsubscribe', '1');
        expect(centrifugoSubscriptions.size).toBe(0);
        expect(centrifugoSubscribers.size).toBe(0);
    });
});
