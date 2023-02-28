import type { ExtractPropTypes, PropType } from 'vue';
import type { Route } from 'vue-router';
import type { IView } from './View';

export const ViewPropsDef: ViewPropsDefType = {
    view: { type: Object, required: true },
    query: { type: Object, default: () => ({}) },
    params: { type: Object, default: () => ({}) },
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ViewPropsDefType<T extends IView = IView> = {
    view: { type: PropType<T>; required: true };
    query: { type: PropType<Route['query']>; default: () => Route['query'] };
    params: { type: PropType<Route['params']>; default: () => Route['params'] };
};

export type ViewProps = ExtractPropTypes<ViewPropsDefType>;
