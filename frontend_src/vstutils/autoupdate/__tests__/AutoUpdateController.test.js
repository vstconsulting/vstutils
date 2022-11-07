import { expect, describe, test, jest } from '@jest/globals';
import Centrifuge from 'centrifuge';
import { AutoUpdateController } from '../AutoUpdateController.ts';

describe('AutoUpdateController', () => {
    test('timer subscriptions', () => {
        const controller = new AutoUpdateController(null);

        const callback = jest.fn();
        expect(controller.timerSubscribers.size).toBe(0);

        controller.subscribe({
            id: '1',
            type: 'timer',
            callback,
        });

        expect(controller.timerSubscribers.size).toBe(1);
        controller.timerSubscribers.get('1').callback();
        expect(callback).toBeCalledTimes(1);

        controller.unsubscribe('1');

        expect(controller.timerSubscribers.size).toBe(0);
    });

    test('centrifugo subscriptions', () => {
        const centrifuge = new Centrifuge('localhost');
        const controller = new AutoUpdateController(centrifuge);

        const subscribers = controller.centrifugoSubscribers;
        const activeSubscriptions = controller.centrifugoActiveSubscriptions;

        const callback1 = jest.fn();
        const callback2 = jest.fn();

        expect(subscribers.size).toBe(0);

        controller.subscribe({
            id: '1',
            type: 'centrifugo',
            callback: callback1,
            channels: ['channel1', 'channel2'],
            pk: null,
        });
        controller.subscribe({
            id: '2',
            type: 'centrifugo',
            callback: callback2,
            channels: ['channel1', 'channel2'],
            pk: null,
        });
        controller.subscribe({
            id: '3',
            type: 'centrifugo',
            callback: callback2,
            channels: ['channel1', 'channel2'],
            pk: null,
        });

        expect(subscribers.size).toBe(3);
        expect(activeSubscriptions.size).toBe(2);

        const subDatas = subscribers.get('1');
        expect(subDatas.length).toBe(2);
        expect(subDatas[0].subscription.channel).toBe('channel1');
        expect(subDatas[1].subscription.channel).toBe('channel2');

        subDatas[0].callback();

        expect(callback1).toBeCalledTimes(1);
        expect(callback2).toBeCalledTimes(0);

        controller.unsubscribe('1');
        expect(subscribers.size).toBe(2);
        expect(activeSubscriptions.size).toBe(2);
        controller.unsubscribe('2');
        controller.unsubscribe('3');
        expect(subscribers.size).toBe(0);
        expect(activeSubscriptions.size).toBe(0);
    });
});
