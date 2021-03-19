/**
 * Function that returns `fallback` if `value` is `undefined`
 * @template T
 * @param {T} value
 * @param {T} fallback
 * @return {T}
 */
function fallbackIfUndef(value, fallback) {
    if (value === undefined) {
        return fallback;
    }

    return value;
}

export class AppConfiguration {
    /**
     * Constructor for app configuration
     * @param {Object} conf
     * @param {boolean=} conf.isDebug
     * @param {URL|string=} conf.hostUrl
     * @param {URL|string=} conf.endpointUrl
     * @param {string=} conf.projectName
     * @param {string=} conf.projectVersion
     * @param {string=} conf.fullVersion
     * @param {string=} conf.fullUserVersion
     * @param {boolean=} conf.isSuperuser
     * @param {boolean=} conf.isStaff
     * @param {Object} conf.schema
     */
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
    } = {}) {
        if (!schema) {
            throw new TypeError('schema is required');
        }

        this.isDebug = fallbackIfUndef(isDebug, window.isDebug);
        this.hostUrl = new URL(fallbackIfUndef(hostUrl, window.host_url));
        this.endpointUrl = new URL(fallbackIfUndef(endpointUrl, window.endpoint_url));
        this.projectName = fallbackIfUndef(projectName, window.project_gui_name);
        this.projectVersion = fallbackIfUndef(projectVersion, window.project_version);
        this.fullVersion = fallbackIfUndef(fullVersion, window.gui_version);
        this.fullUserVersion = fallbackIfUndef(fullUserVersion, window.gui_user_version);
        this.isSuperuser = fallbackIfUndef(isSuperuser, window.is_superuser);
        this.isStaff = fallbackIfUndef(isStaff, window.is_staff);
        this.schema = schema;

        this.urls = {
            login: schema.info['x-settings'].login_url,
            logout: schema.info['x-settings'].logout_url,
        };

        this.defaultPageLimit = defaultPageLimit || schema.info['x-page-limit'];
    }
}
