/**
 * Class for Errors connected with API requests.
 */
export default class StatusError extends Error {
    /**
     * Constructor of StatusError class.
     * @param {number} status Status of HTTP response.
     * @param {string|Object} data Error object.
     */
    constructor(status, data) {
        super();
        this.status = status;
        this.message = undefined;
        this.data = data;
        if (typeof data == 'string') {
            this.message = data;
        }
        if (typeof data == 'object' && data.detail) {
            this.message = data.detail;
        }
    }
}
