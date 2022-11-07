import * as Visibility from 'visibilityjs';
import * as Centrifuge from 'centrifuge';
import { guiLocalSettings, randomSleep } from '../utils';

export interface AutoUpdateAction {
    id: ActionId;
    callback: () => Promise<unknown>;
    type: 'timer' | 'centrifugo';
}

export interface TimerAutoUpdateAction extends AutoUpdateAction {
    type: 'timer';
}

export interface CentrifugoAutoUpdateAction extends AutoUpdateAction {
    pk?: number | string | null;
    channels?: CentrifugoChannel[];
    labels?: string[];
    type: 'centrifugo';
}

interface CentrifugoSubscriptionData {
    callback: () => Promise<unknown>;
    subscription: Centrifuge.Subscription;
}

type CentrifugoChannel = string;
type ActionId = string;
type SubscriberId = string;

export class AutoUpdateController {
    centrifugo?: Centrifuge | null;
    isStarted = false;

    // Timer related
    timeoutId?: ReturnType<typeof setTimeout>;
    timerSubscribers: Map<SubscriberId, TimerAutoUpdateAction> = new Map<
        SubscriberId,
        TimerAutoUpdateAction
    >();

    // Centrifugo related
    bulkedActions: CentrifugoSubscriptionData[] = [];
    nextBulkExecutionPromise: Promise<unknown> = Promise.resolve();

    centrifugoSubscribers: Map<SubscriberId, CentrifugoSubscriptionData[]> = new Map<
        SubscriberId,
        CentrifugoSubscriptionData[]
    >();
    centrifugoActiveSubscriptions: Map<Centrifuge.Subscription, number> = new Map<
        Centrifuge.Subscription,
        number
    >();

    subscriptionsPrefix: string;

    constructor(centrifuge?: Centrifuge | null, subscriptionsPrefix?: string | null) {
        this.centrifugo = centrifuge;
        this.subscriptionsPrefix = subscriptionsPrefix ?? '';
    }

    subscribe(action: TimerAutoUpdateAction | CentrifugoAutoUpdateAction) {
        const subscriberId = action.id;

        // Timer subscription
        if (action.type === 'timer') {
            this.timerSubscribers.set(subscriberId, action);
            return;
        }

        // Centrifugo subscription
        const channels =
            action.channels ??
            action.labels?.map((label) => {
                if (this.subscriptionsPrefix) {
                    return `${this.subscriptionsPrefix}.${label}`;
                }
                return label;
            }) ??
            [];

        for (const channel of channels) {
            const subscription = this.centrifugo!.subscribe(channel, () => {
                this.onCentrifugoUpdate(subscriberId);
            });
            this.addCentrifugoSubscriptionData(subscriberId, {
                callback: action.callback,
                subscription,
            });
            this.addCentrifugoActiveSubscription(subscription);
        }
    }

    unsubscribe(subscriberId: SubscriberId) {
        // Timer subscription
        if (this.timerSubscribers.has(subscriberId)) {
            this.timerSubscribers.delete(subscriberId);
            return;
        }

        // Centrifugo subscription
        const subDatas = this.centrifugoSubscribers.get(subscriberId) ?? [];
        subDatas.forEach((subData) => {
            const activeSubs = this.centrifugoActiveSubscriptions.get(subData.subscription)! - 1;
            this.centrifugoActiveSubscriptions.set(subData.subscription, activeSubs);
            if (activeSubs <= 0) {
                subData.subscription.unsubscribe();
                this.centrifugoActiveSubscriptions.delete(subData.subscription);
            }
        });
        this.centrifugoSubscribers.delete(subscriberId);
    }

    start() {
        this.isStarted = true;

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.timeoutId = setTimeout(async () => {
            if (Visibility.state() !== 'hidden') {
                await this.updateTimerData();
            }

            if (this.isStarted) {
                this.start();
            }
        }, this.getTimerInterval());
    }

    stop() {
        this.isStarted = false;
        const subscribers = Array.from(this.centrifugoSubscribers.keys());
        subscribers.forEach((subscriber) => this.unsubscribe(subscriber));
    }

    // Timer related

    private getTimerInterval() {
        return (guiLocalSettings.get('page_update_interval') as number) || 5000;
    }

    private updateTimerData() {
        return Promise.allSettled(
            Array.from(this.timerSubscribers.values()).map((action) => action.callback()),
        );
    }

    // Centrifugo related
    private addCentrifugoActiveSubscription(subscription: Centrifuge.Subscription) {
        const activeSubs = this.centrifugoActiveSubscriptions.get(subscription) ?? 0;
        this.centrifugoActiveSubscriptions.set(subscription, activeSubs + 1);
    }

    private addCentrifugoSubscriptionData(id: SubscriberId, subscriptionData: CentrifugoSubscriptionData) {
        const subDatas = this.centrifugoSubscribers.get(id);
        if (!subDatas) {
            this.centrifugoSubscribers.set(id, [subscriptionData]);
        } else {
            subDatas.push(subscriptionData);
        }
    }

    private bulkInvoke(sub: CentrifugoSubscriptionData) {
        if (this.bulkedActions.includes(sub)) {
            return;
        }

        if (this.bulkedActions.length === 0) {
            this.nextBulkExecutionPromise = this.nextBulkExecutionPromise
                .then(() => randomSleep(100, 1000))
                .then(() => {
                    const actionsCopy = this.bulkedActions.slice();
                    this.bulkedActions = [];
                    return Promise.allSettled(actionsCopy.map((action) => action.callback()));
                });
        }

        this.bulkedActions.push(sub);
    }

    private onCentrifugoUpdate(subscriberId: SubscriberId) {
        const subDatas = this.centrifugoSubscribers.get(subscriberId) ?? [];
        subDatas.forEach((subData) => this.bulkInvoke(subData));
    }
}
