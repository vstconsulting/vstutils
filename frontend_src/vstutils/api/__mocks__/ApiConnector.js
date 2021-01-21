import { APIResponse, ApiConnector as OriginalApiConnector } from '../ApiConnector.js';
export { APIResponse };

export class ApiConnector extends OriginalApiConnector {
    constructor() {
        super();
        this._bulkHandler = (requests) => requests.map(() => ({ status: 200, data: {} }));
        this._requestHandler = () => new APIResponse(200, {});
    }

    async sendBulk(requests) {
        return this._bulkHandler(requests);
    }

    async bulkQuery(request) {
        return this._requestHandler(request);
    }

    async makeRequest(request) {
        return this._requestHandler(request);
    }
}
