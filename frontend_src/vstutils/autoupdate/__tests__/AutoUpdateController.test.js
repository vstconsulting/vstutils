import { Centrifuge } from 'centrifuge';
import { AutoUpdateController } from '../AutoUpdateController.ts';

describe('AutoUpdateController', () => {
    test('timer subscriptions', () => {
        const controller = new AutoUpdateController(null);

        const callback = vitest.fn();
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
        const channelSubscriptions = controller.channelSubscriptions;
        const channelSubscribers = controller.channelSubscribers;

        const callback1 = vitest.fn();
        const callback2 = vitest.fn();

        expect(subscribers.size).toBe(0);

        controller.subscribe({
            id: '1',
            type: 'centrifugo',
            callback: callback1,
            channels: ['channel1', 'channel2'],
            pk: undefined,
        });
        controller.subscribe({
            id: '2',
            type: 'centrifugo',
            callback: callback2,
            channels: ['channel1', 'channel2'],
            pk: 3,
        });
        controller.subscribe({
            id: '3',
            type: 'centrifugo',
            callback: callback2,
            channels: ['channel2'],
            pk: null,
        });

        expect(subscribers.size).toBe(3);
        expect(channelSubscriptions.size).toBe(2);
        expect(channelSubscribers.size).toBe(2);
        expect(channelSubscribers.get('channel1').size).toBe(2);

        const subDatas = subscribers.get('1');
        expect(subDatas.channels).toEqual(['channel1', 'channel2']);

        subDatas.callback();

        expect(callback1).toBeCalledTimes(1);
        expect(callback2).toBeCalledTimes(0);

        controller.unsubscribe('1');
        expect(subscribers.size).toBe(2);
        expect(channelSubscriptions.size).toBe(2);
        controller.unsubscribe('2');
        controller.unsubscribe('3');
        expect(subscribers.size).toBe(0);
        expect(channelSubscriptions.size).toBe(0);
    });
});
