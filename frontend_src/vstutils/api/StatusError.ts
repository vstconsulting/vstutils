interface ErrorDetail {
    detail: string;
}

/**
 * Class for Errors connected with API requests.
 */
export default class StatusError extends Error {
    status: number;
    data: unknown;
    message: string;

    constructor(status: number, data: unknown) {
        super();
        this.status = status;
        this.message = '';
        if (typeof data == 'string') {
            this.message = data;
        } else if (data && 'detail' in data) {
            this.message = (data as ErrorDetail).detail;
        }
    }
}
