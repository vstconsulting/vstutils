import { signals } from '#vstutils/signals';
import { RepresentData } from '#vstutils/utils';

const signalName = (model: string, field: string) =>
    `NestedObjectsTableRowBeforeChange.${model}.${field}.beforeChange`;

type NestedObjectsTableRowBeforeChangeCtx = {
    changedField: string;
    rowData: RepresentData;
    newValue: unknown;
    oldValue: unknown;
};

/**
 * @internal
 */
export function emitNestedObjectsTableRowBeforeChange(
    modelName: string,
    fieldName: string,
    ctx: NestedObjectsTableRowBeforeChangeCtx,
) {
    signals.emit(signalName(modelName, fieldName), ctx);
}

export function onNestedObjectsTableRowBeforeChange(params: {
    modelName: string;
    fieldName: string;
    handler: (ctx: NestedObjectsTableRowBeforeChangeCtx) => void;
}) {
    signals.on({
        signal: signalName(params.modelName, params.fieldName),
        callback: params.handler as any,
    });
}
