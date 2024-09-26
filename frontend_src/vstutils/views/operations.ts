import type { IAppInitialized } from '../app';
import type { Model, ModelConstructor } from '../models';
import type { HttpMethod, MaybePromise, RepresentData } from '../utils';
import type { ActionView } from './View';

export type OperationOnBeforeParams = {
    operation: Operation;
};

export type OperationOnBeforeResult = {
    prevent?: boolean;
};

export type OperationOnBeforeHook = (
    params: OperationOnBeforeParams,
) => MaybePromise<OperationOnBeforeResult | void>;

export interface Operation {
    name: string;
    title: string;
    style?: Record<string, string | number> | string;
    classes?: string[];
    iconClasses?: string[];
    appendFragment?: string;
    hidden?: boolean;
    doNotShowOnList?: boolean;
    doNotGroup?: boolean;
    isFileResponse?: boolean;
    auth?: boolean;
    onBefore?: OperationOnBeforeHook;
}

export interface Sublink extends Operation {
    href?: string | (() => string);
    external?: boolean;
}

/**
 * Object that describes one action.
 * For empty action path and method are required.
 * For non empty action component or href must me provided.
 */
export interface Action extends Operation {
    isEmpty?: boolean;
    isMultiAction?: boolean;
    component?: any;
    path?: string;
    href?: string;
    method?: HttpMethod;
    auth?: boolean;
    confirmationRequired?: boolean;
    view?: ActionView;
    responseModel?: ModelConstructor;
    handler?: (args: {
        action: Action;
        instance?: Model;
        fromList?: boolean;
        disablePopUp?: boolean;
    }) => Promise<any> | any;
    handlerMany?: (args: {
        action: Action;
        instances: Model[];
        disablePopUp?: boolean;
    }) => Promise<any> | any;
    redirectPath?: string | (() => string);
    onAfter?: (args: { app: IAppInitialized; action: Action; response: unknown; instance?: Model }) => void;
}

export interface NotEmptyAction extends Action {
    isEmpty: false;
    requestModel: ModelConstructor;
}

export function filterOperationsBasedOnAvailabilityField<T extends { name: string }>(
    operations: T[],
    data: RepresentData,
    operationsAvailabilityFieldName: string | undefined,
) {
    if (operationsAvailabilityFieldName) {
        const availability = data[operationsAvailabilityFieldName] as
            | Record<string, boolean>
            | string[]
            | undefined;
        if (availability) {
            if (Array.isArray(availability)) {
                return operations.filter((op) => availability.includes(op.name));
            } else {
                return operations.filter((op) => availability[op.name]);
            }
        }
    }
    return operations;
}
