import type * as swagger from 'swagger-schema-official';
import type { FieldDefinition } from './fields/FieldsResolver';
import { type HttpMethod } from './utils';

declare global {
    interface Window {
        host_url: string;
        gui_version: string;
        gui_user_version: string;
        is_superuser: boolean;
        is_staff: boolean;
    }
}

export interface XMenuItem {
    name: string;
    span_class?: string | string[];
    url?: string;
    origin_link?: boolean;
    sublinks?: XMenuItem[];
}

export type XMenu = XMenuItem[];

export interface AppInfo extends swagger.Info {
    'x-settings': {
        static_path: string;
        enable_gravatar?: boolean;
        gravatar_url?: string;
        [key: string]: any;
    };
    'x-versions': {
        application: string;
        library: string;
        vstutils: string;
    };
    'x-docs': {
        has_docs: boolean;
        docs_url: string;
    };
    'x-page-limit': number;
    'x-menu': XMenu;
    'x-centrifugo-address'?: string;
    'x-centrifugo-token'?: string;
    'x-subscriptions-prefix': string;
    'x-webpush'?: {
        public_key: string;
        user_settings_subpath: string | null;
    };
    [key: string]: any;
}

export const MODEL_MODES = ['DEFAULT', 'STEP'] as const;

export type FieldInitialValueConfig = {
    type: 'from_first_parent_detail_view_that_has_field';
    field_name: string;
};

export type ModelInitialValuesConfig = {
    [key: string]: FieldInitialValueConfig;
};

export type ModelDefinition = swagger.Schema & {
    properties?: Record<string, FieldDefinition>;
    'x-properties-groups'?: Record<string, string[]>;
    'x-view-field-name'?: string;
    'x-non-bulk-methods'?: HttpMethod[];
    'x-translate-model'?: string;
    'x-hide-not-required'?: boolean;
    'x-display-mode'?: (typeof MODEL_MODES)[number];
    'x-visibility-data-field-name'?: string;
    'x-initial-values'?: ModelInitialValuesConfig;
    'x-hidden-fields'?: string[];
};

export interface Operation extends swagger.Operation {
    'x-hidden'?: boolean;
    'x-list'?: boolean;
}

export type Path = swagger.Path & {
    [key in HttpMethod]?: Operation | undefined;
};

export interface AppSchema extends swagger.Spec {
    info: AppInfo;
    definitions: Record<string, ModelDefinition>;
    paths: Record<string, Path>;
    [key: string]: any;
}
