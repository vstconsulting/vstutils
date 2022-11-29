import TabSignal from '@vstconsulting/tabsignal';

import type { Model } from '@/vstutils/models';
import type { IAppInitialized } from './app';

export const signals = new TabSignal('application');

export const APP_CREATED = 'APP_CREATED';
export const APP_AFTER_INIT = 'app.afterInit';
export const APP_BEFORE_INIT = 'app.beforeInit';
export const SCHEMA_MODELS_CREATED = 'allModels.created';

const emittedSignals = new Map<string, unknown[]>();
const signalsCallbacks = new Map<string, ((...args: unknown[]) => void)[]>();

function onSignalEmitted(signal: string, args: unknown[]) {
    emittedSignals.set(signal, args);
    const callbacks = signalsCallbacks.get(signal);
    if (callbacks) {
        for (const callback of callbacks) {
            callback(...args);
        }
    }
}

function invokeOrRegisterCallback(signal: string, callback: (...args: unknown[]) => void) {
    const args = emittedSignals.get(APP_AFTER_INIT);
    if (args) {
        callback(...args);
        return;
    }
    const callbacks = signalsCallbacks.get(signal);
    if (callbacks) {
        callbacks.push(callback);
    } else {
        signalsCallbacks.set(signal, [callback]);
    }
}

signals.connect(APP_CREATED, () => {
    emittedSignals.clear();
    signalsCallbacks.clear();
});

function createHook<T extends unknown[]>(signal: string) {
    signals.connect(signal, (...args: unknown[]) => {
        onSignalEmitted(signal, args);
    });

    return function hook(callback: (...args: T) => void) {
        invokeOrRegisterCallback(signal, callback as (...args: unknown[]) => void);
    };
}

export const onAppAfterInit = createHook<[{ app: IAppInitialized }]>(APP_AFTER_INIT);
export const onAppBeforeInit = createHook<[{ app: IAppInitialized }]>(APP_BEFORE_INIT);
export const onSchemaModelsCreated =
    createHook<[{ app: IAppInitialized; models: Map<string, Model> }]>(SCHEMA_MODELS_CREATED);
