import { defineStore } from 'pinia';

export interface AutoUpdateAction {
    id: string;
    triggerType: 'timer' | 'centrifugo';
    callback: () => Promise<void>;
}

export interface TimerAutoUpdateAction extends AutoUpdateAction {
    triggerType: 'timer';
}

export interface CentrifugoAutoUpdateAction extends AutoUpdateAction {
    triggerType: 'centrifugo';
    labels: string[];
    pk?: number | string | null;
}
interface State {
    timerSubscribers: Map<string, TimerAutoUpdateAction>;

    centrifugoSubscribers: Map<string, CentrifugoAutoUpdateAction>;
    centrifugoSubscriptions: Map<string, CentrifugoAutoUpdateAction[]>;
}

export const useAutoUpdateStore = defineStore('autoUpdateStore', {
    state: (): State => ({
        timerSubscribers: new Map(),

        centrifugoSubscribers: new Map(),
        centrifugoSubscriptions: new Map(),
    }),
    actions: {
        subscribe(action: TimerAutoUpdateAction | CentrifugoAutoUpdateAction) {
            const autoUpdateId = action.id;

            // Timer subscription
            if (action.triggerType === 'timer') {
                this.timerSubscribers.set(autoUpdateId, action);
                return;
            }

            // Centrifugo subscription
            this.centrifugoSubscribers.set(autoUpdateId, action);
            for (const label of action.labels) {
                const existingLabels = this.centrifugoSubscriptions.get(label);
                if (existingLabels) {
                    existingLabels.push(action);
                } else {
                    this.centrifugoSubscriptions.set(label, [action]);
                }
            }
        },

        unsubscribe(autoUpdateId: string) {
            // Timer subscription
            if (this.timerSubscribers.has(autoUpdateId)) {
                this.timerSubscribers.delete(autoUpdateId);
                return;
            }

            // Centrifugo subscription
            if (this.centrifugoSubscribers.has(autoUpdateId)) {
                const action = this.centrifugoSubscribers.get(autoUpdateId);
                this.centrifugoSubscribers.delete(autoUpdateId);
                for (const label of action?.labels ?? []) {
                    const subscribers = this.centrifugoSubscriptions.get(label) ?? [];
                    subscribers.splice(
                        subscribers.findIndex((action) => autoUpdateId === action.id),
                        1,
                    );
                    if (subscribers.length === 0) {
                        this.centrifugoSubscriptions.delete(label);
                    }
                }
            }
        },
    },
});

export type AutoUpdateStore = ReturnType<typeof useAutoUpdateStore>;
