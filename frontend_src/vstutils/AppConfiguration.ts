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

interface Schema {
    info: {
        'x-settings': {
            static_path: string;
            login_url: string;
            logout_url: string;
            [key: string]: any;
        };
        'x-page-limit': number;
        [key: string]: any;
    };
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
    schema: Schema;
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
    schema: Record<string, any>;
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
