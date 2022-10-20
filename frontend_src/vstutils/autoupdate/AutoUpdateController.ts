import * as Visibility from 'visibilityjs';
import type * as Centrifuge from 'centrifuge';
import { guiLocalSettings, randomSleep } from '../utils';
import type { AutoUpdateStore, AutoUpdateAction } from './autoUpdateStore';

interface CentrifugoUpdate {
    pk: string | number;
    'subscribe-label': string[];
}

interface SubscriptionsUpdateMessage {
    data: CentrifugoUpdate;
}

export class AutoUpdateController {
    store: AutoUpdateStore;
    centrifugo?: Centrifuge;
    centrifugoSubscription?: Centrifuge.Subscription;
    isStarted = false;

    // Timer related
    timeoutId?: ReturnType<typeof setTimeout>;

    // Centrifugo related
    bulkedActions: AutoUpdateAction[] = [];
    bulkedActionsTimeout?: ReturnType<typeof setTimeout>;
    bulkedActionsDelay = 1000;

    constructor(store: AutoUpdateStore, centrifuge?: Centrifuge) {
        this.store = store;
        this.centrifugo = centrifuge;
    }

    init() {
        if (this.centrifugo) {
            this.centrifugoSubscription = this.centrifugo.subscribe('subscriptions_update', (message) =>
                this.onCentrifugoUpdate((message as SubscriptionsUpdateMessage).data),
            );
        }
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
        clearTimeout(this.timeoutId);
        if (this.centrifugoSubscription) {
            this.centrifugoSubscription.unsubscribe();
            this.centrifugoSubscription.removeAllListeners();
        }
    }

    private invokeSubscriber(action: AutoUpdateAction) {
        return action.callback();
    }

    // Timer related

    private getTimerInterval() {
        return (guiLocalSettings.get('page_update_interval') as number) || 5000;
    }

    private updateTimerData() {
        return Promise.allSettled(
            Array.from(this.store.timerSubscribers.values()).map((action) => this.invokeSubscriber(action)),
        );
    }

    // Centrifugo related

    private bulkInvoke(action: AutoUpdateAction) {
        if (!this.bulkedActions.includes(action)) {
            this.bulkedActions.push(action);

            if (!this.bulkedActionsTimeout) {
                this.bulkedActionsTimeout = setTimeout(() => {
                    // Add random delay up to 1 second to avoid massive simultaneous requests from clients
                    void randomSleep(1, 1000).then(() => {
                        const actionsCopy = this.bulkedActions.slice();
                        this.bulkedActionsTimeout = undefined;
                        this.bulkedActions = [];
                        actionsCopy.map((action) => this.invokeSubscriber(action));
                    });
                }, this.bulkedActionsDelay);
            }
        }
    }

    private onCentrifugoUpdate({ 'subscribe-label': labels, pk }: CentrifugoUpdate) {
        const actionsToInvoke = new Set<AutoUpdateAction>();
        for (const label of labels) {
            const actions = this.store.centrifugoSubscriptions.get(label);
            if (actions) {
                for (const action of actions) {
                    if (!action.pk || String(action.pk) === String(pk)) {
                        actionsToInvoke.add(action);
                    }
                }
            }
        }
        return Array.from(actionsToInvoke).map((action) => this.bulkInvoke(action));
    }
}
