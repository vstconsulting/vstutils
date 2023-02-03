import TabSignal from '@vstconsulting/tabsignal';

import { capitalize, getApp } from '@/vstutils/utils';

import type { Model } from '@/vstutils/models';
import type { IAppInitialized } from '@/vstutils/app';
import type { RepresentData } from '@/vstutils/utils';
import type { Action, Sublink } from '@/vstutils/views';

export const signals = new TabSignal('application');

export const APP_CREATED = 'APP_CREATED';
export const APP_AFTER_INIT = 'app.afterInit';
export const APP_BEFORE_INIT = 'app.beforeInit';
export const SCHEMA_MODELS_CREATED = 'allModels.created';

const createHook = (() => {
    const emittedSignals = new Map<string, unknown[]>();
    const signalsCallbacks = new Map<string, ((...args: unknown[]) => void)[]>();

    function onSignalEmitted(signal: string, args: unknown[]) {
        emittedSignals.set(signal, args);
        const callbacks = signalsCallbacks.get(signal);
        if (callbacks) {
            for (const callback of callbacks) {
                try {
                    callback(...args);
                } catch (e) {
                    console.error('Error in signal callback', e);
                }
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

    return function createHook<T extends unknown[]>(signal: string) {
        signals.connect(signal, (...args: unknown[]) => {
            onSignalEmitted(signal, args);
        });

        return function hook(callback: (...args: T) => void) {
            invokeOrRegisterCallback(signal, callback as (...args: unknown[]) => void);
        };
    };
})();

export const onAppAfterInit = createHook<[{ app: IAppInitialized }]>(APP_AFTER_INIT);
export const onAppBeforeInit = createHook<[{ app: IAppInitialized }]>(APP_BEFORE_INIT);
export const onSchemaModelsCreated =
    createHook<[{ app: IAppInitialized; models: Map<string, Model> }]>(SCHEMA_MODELS_CREATED);

/** @internal */
export function filterOperations<T extends Action | Sublink>(
    type: 'actions' | 'sublinks',
    ops: T[],
    data?: RepresentData,
    isListItem = false,
): T[] {
    const obj = {
        [type]: ops,
        data,
        isListItem,
    };
    signals.emit(`<${getApp().store.page.view.path}>filter${capitalize(type)}`, obj);
    return obj[type] as T[];
}
