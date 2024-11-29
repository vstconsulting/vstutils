import { onScopeDispose } from 'vue';
import TabSignal from '@vstconsulting/tabsignal';

import { capitalize, getApp } from '#vstutils/utils';

import type { Model } from '#vstutils/models';
import type { IAppInitialized } from './app';
import type { RepresentData } from '#vstutils/utils';
import type { Action, OperationOnBeforeHook, Sublink } from './views/operations';
import type { RouteConfig } from 'vue-router';
import type { AppSchema } from './schema';
import type { Field } from './fields/base';

export const signals = new TabSignal('application');

export const SCHEMA_LOADED = 'openapi.loaded';
export const APP_CREATED = 'APP_CREATED';
export const APP_AFTER_INIT = 'app.afterInit';
export const APP_BEFORE_INIT = 'app.beforeInit';
export const SCHEMA_MODELS_CREATED = 'allModels.created';
export const SCHEMA_VIEWS_CREATED = 'allViews.created';
export const ROUTES_CREATED = 'allRoutes.created';

export function useSignalSubscription(name: string, callback: (...args: any[]) => void) {
    const signalSlot = signals.on({
        signal: name,
        callback,
    });

    onScopeDispose(() => {
        signals.disconnect(signalSlot!, name);
    });
}

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

    let isFirst = true;

    signals.connect(APP_CREATED, () => {
        if (!isFirst) {
            emittedSignals.clear();
            signalsCallbacks.clear();
        }
        isFirst = false;
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

export const onAppCreated = createHook<[{ app: IAppInitialized }]>(APP_CREATED);
export const onAppAfterInit = createHook<[{ app: IAppInitialized }]>(APP_AFTER_INIT);
export const onAppBeforeInit = createHook<[{ app: IAppInitialized }]>(APP_BEFORE_INIT);
export const onSchemaViewsCreated = createHook<[{ views: IAppInitialized['views'] }]>(SCHEMA_VIEWS_CREATED);
export const onRoutesCreated = createHook<[RouteConfig[]]>(ROUTES_CREATED);
export const onSchemaLoaded = createHook<[AppSchema]>(SCHEMA_LOADED);
export const hookViewOperation = (params: {
    path: string;
    operation: string;
    onBefore?: OperationOnBeforeHook;
}) => {
    onSchemaViewsCreated(({ views }) => {
        const view = views.get(params.path);
        if (!view) {
            console.error(`View "${params.path}" not found`);
            return;
        }

        const operation = view.actions.get(params.operation) || view.sublinks.get(params.operation);
        if (!operation) {
            console.error(`Operation "${params.operation}" for view ${params.path} not found`);
            return;
        }

        if (params.onBefore) {
            operation.onBefore = params.onBefore;
        }
    });
};

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

type FilterOperationsCallbackArg<T extends 'actions' | 'sublinks'> = {
    data?: RepresentData;
    isListItem: boolean;
} & (T extends 'actions' ? { actions: Action[] } : { sublinks: Sublink[] });

export function onFilterOperations<T extends 'actions' | 'sublinks'>(
    type: T,
    path: string,
    callback: (arg: FilterOperationsCallbackArg<T>) => void,
) {
    // @ts-expect-error Missing typing
    signals.connect(`<${path}>filter${capitalize(type)}`, callback);
}

export const { emit: emitFilterListViewColumns, on: onFilterListViewColumns } = (() => {
    type Context = Readonly<{
        filters: Record<string, unknown>;
        columns: Field[];
    }>;
    type InternalCtx = {
        ctx: Context;
        _returnValue: Field[];
    };

    /**
     * @internal
     */
    function emit(viewPath: string, ctx: Context): Field[] | void {
        const internalCtx: InternalCtx = {
            ctx,
            _returnValue: ctx.columns,
        };
        signals.emit(`<${viewPath}>filterListViewColumns`, internalCtx);
        return internalCtx._returnValue;
    }

    function on(viewPath: string, handler: (ctx: Context) => Field[] | void) {
        signals.connect(
            `<${viewPath}>filterListViewColumns`,
            // @ts-expect-error Missing typing
            (ctx: InternalCtx) => {
                const newValue = handler(ctx.ctx);
                if (newValue) {
                    ctx._returnValue = newValue;
                }
            },
        );
    }

    return { emit, on };
})();
