import type * as swagger from 'swagger-schema-official';
import type { FieldDefinition } from './fields/FieldsResolver';
import { type HttpMethod } from './utils';

declare global {
    interface Window {
        isDebug: boolean;
        host_url: string;
        endpoint_url: string;
        project_gui_name: string;
        project_version: string;
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
        login_url: string;
        logout_url: string;
        [key: string]: any;
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

export type ModelDefinition = swagger.Schema & {
    properties?: Record<string, FieldDefinition>;
    'x-properties-groups'?: Record<string, string[]>;
    'x-view-field-name'?: string;
    'x-non-bulk-methods'?: HttpMethod[];
    'x-translate-model'?: string;
    'x-hide-not-required'?: boolean;
    'x-display-mode'?: typeof MODEL_MODES[number];
    'x-visibility-data-field-name'?: string;
};

export interface Operation extends swagger.Operation {
    'x-hidden'?: boolean;
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

interface Params {
    isDebug?: boolean;
    hostUrl?: string;
    endpointUrl?: string;
    projectName?: string;
    projectVersion?: string;
    fullVersion?: string;
    fullUserVersion?: string;
    isSuperuser?: boolean;
    isStaff?: boolean;
    schema: AppSchema;
    defaultPageLimit?: number;
}

export class AppConfiguration {
    isDebug: boolean;
    hostUrl: URL;
    endpointUrl: URL;
    projectName: string;
    projectVersion: string;
    fullVersion: string;
    fullUserVersion: string;
    isSuperuser: boolean;
    isStaff: boolean;
    schema: AppSchema;
    defaultPageLimit: number;
    staticPath: string;
    urls: {
        login: string;
        logout: string;
    };

    constructor({
        isDebug,
        hostUrl,
        endpointUrl,
        projectName,
        projectVersion,
        fullVersion,
        fullUserVersion,
        isSuperuser,
        isStaff,
        schema,
        defaultPageLimit,
    }: Params) {
        if (!schema) {
            throw new TypeError('schema is required');
        }
        this.schema = schema;

        this.isDebug = isDebug ?? window.isDebug;
        this.hostUrl = new URL(hostUrl ?? window.host_url);
        this.endpointUrl = new URL(endpointUrl ?? window.endpoint_url);
        this.projectName = projectName ?? window.project_gui_name;
        this.projectVersion = projectVersion ?? window.project_version;
        this.fullVersion = fullVersion ?? window.gui_version;
        this.fullUserVersion = fullUserVersion ?? window.gui_user_version;
        this.isSuperuser = isSuperuser ?? window.is_superuser;
        this.isStaff = isStaff ?? window.is_staff;
        this.staticPath = schema.info['x-settings'].static_path;

        this.urls = {
            login: schema.info['x-settings'].login_url,
            logout: schema.info['x-settings'].logout_url,
        };

        this.defaultPageLimit = defaultPageLimit ?? schema.info['x-page-limit'];
    }
}
