import * as Visibility from 'visibilityjs';
import type * as Centrifuge from 'centrifuge';
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
    pk?: SubscriptionPk;
    channels?: CentrifugoChannel[];
    labels?: string[];
    type: 'centrifugo';
}

export interface SubscribedCentrifugoAction extends CentrifugoAutoUpdateAction {
    pk?: string;
    channels: CentrifugoChannel[];
    labels?: never;
}

type CentrifugoChannel = string;
type ActionId = string;
type SubscriberId = string;
type SubscriptionPk = string | number | undefined;

interface PublicationContext extends Centrifuge.PublicationContext {
    data:
        | {
              pk?: string | number;
              [key: string]: unknown;
          }
        | undefined;
}

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
    bulkedActions: SubscribedCentrifugoAction[] = [];
    nextBulkExecutionPromise: Promise<unknown> = Promise.resolve();

    centrifugoSubscribers = new Map<SubscriberId, SubscribedCentrifugoAction>();
    channelSubscriptions = new Map<CentrifugoChannel, { sub: Centrifuge.Subscription; count: number }>();
    channelSubscribers = new Map<CentrifugoChannel, Map<SubscriptionPk, SubscribedCentrifugoAction[]>>();

    subscriptionsPrefix: string;

    constructor(centrifuge?: Centrifuge | null, subscriptionsPrefix?: string | null) {
        this.centrifugo = centrifuge;
        this.subscriptionsPrefix = subscriptionsPrefix ?? '';
    }

    private async executeCallbacks(actions: Iterable<{ callback: () => unknown }>): Promise<void> {
        const promises = [];
        for (const action of actions) {
            promises.push(action.callback());
        }
        const results = await Promise.allSettled(promises);
        for (const result of results) {
            if (result.status === 'rejected') {
                console.warn('Auto update callback failed', result.reason);
            }
        }
    }

    subscribe(action: TimerAutoUpdateAction | CentrifugoAutoUpdateAction) {
        const subscriberId = action.id;

        // Timer subscription
        if (action.type === 'timer') {
            this.timerSubscribers.set(subscriberId, action);
            return;
        }

        // Centrifugo subscription
        const centAction: SubscribedCentrifugoAction = {
            id: action.id,
            type: 'centrifugo',
            pk: action.pk === undefined ? undefined : String(action.pk),
            callback: action.callback,
            channels:
                action.channels ??
                action.labels!.map((label) => {
                    if (this.subscriptionsPrefix) {
                        return `${this.subscriptionsPrefix}.${label}`;
                    }
                    return label;
                }),
        };
        this.centrifugoSubscribers.set(subscriberId, centAction);

        for (const channel of centAction.channels) {
            let subscription = this.channelSubscriptions.get(channel);
            if (!subscription) {
                subscription = { sub: this.centrifugo!.subscribe(channel), count: 0 };
                this.channelSubscriptions.set(channel, subscription);
                subscription.sub.on('publish', (event: PublicationContext) =>
                    this.onCentrifugoUpdate(channel, event),
                );
            }
            subscription.count = subscription.count + 1;

            let channelSubscriptions = this.channelSubscribers.get(channel);
            if (!channelSubscriptions) {
                channelSubscriptions = new Map();
                this.channelSubscribers.set(channel, channelSubscriptions);
            }

            let pkSubscriptions = channelSubscriptions.get(centAction.pk);
            if (!pkSubscriptions) {
                pkSubscriptions = [];
                channelSubscriptions.set(centAction.pk, pkSubscriptions);
            }
            pkSubscriptions.push(centAction);
        }
    }

    unsubscribe(subscriberId: SubscriberId) {
        // Timer subscription
        if (this.timerSubscribers.has(subscriberId)) {
            this.timerSubscribers.delete(subscriberId);
            return;
        }

        // Centrifugo subscription
        const action = this.centrifugoSubscribers.get(subscriberId);
        if (!action) {
            return;
        }

        for (const channel of action.channels) {
            // Remove subscribers
            const subscribers = this.channelSubscribers.get(channel);
            if (subscribers?.has(action.pk)) {
                const pkSubscribers = subscribers.get(action.pk)!;
                const idx = pkSubscribers.indexOf(action);
                if (idx !== -1) {
                    pkSubscribers.splice(idx, 1);
                    if (pkSubscribers.length === 0) {
                        subscribers.delete(action.pk);
                    }
                }
                if (subscribers.size === 0) {
                    this.channelSubscribers.delete(channel);
                }
            }

            // Remove and stop subscription
            const subscription = this.channelSubscriptions.get(channel);
            if (subscription) {
                subscription.count = subscription.count - 1;
                if (subscription.count === 0) {
                    subscription.sub.unsubscribe();
                    subscription.sub.removeAllListeners();
                    this.channelSubscriptions.delete(channel);
                }
            }
        }

        this.centrifugoSubscribers.delete(subscriberId);
    }

    start() {
        if (globalThis.DISABLE_AUTO_UPDATE) return;

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
        return this.executeCallbacks(this.timerSubscribers.values());
    }

    // Centrifugo related

    private bulkInvoke(subs?: Iterable<SubscribedCentrifugoAction>) {
        if (!subs) {
            return;
        }

        let added = false;

        for (const sub of subs) {
            if (this.bulkedActions.includes(sub)) {
                continue;
            }
            added = true;
            this.bulkedActions.push(sub);
        }
        if (added) {
            this.nextBulkExecutionPromise = this.nextBulkExecutionPromise
                .then(() => randomSleep(100, 1000))
                .then(() => {
                    const actionsCopy = this.bulkedActions.slice();
                    this.bulkedActions = [];
                    return this.executeCallbacks(actionsCopy);
                });
        }
    }

    private onCentrifugoUpdate(channel: string, { data }: PublicationContext) {
        const subscribers = this.channelSubscribers.get(channel);
        if (subscribers) {
            this.bulkInvoke(subscribers.get(undefined));

            if (data?.pk !== undefined) {
                this.bulkInvoke(subscribers.get(String(data.pk)));
            }
        }
    }
}
