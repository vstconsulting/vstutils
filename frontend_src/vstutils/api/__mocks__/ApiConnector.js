import { APIResponse, ApiConnector as OriginalApiConnector } from '../ApiConnector.ts';
export { APIResponse };

export class ApiConnector extends OriginalApiConnector {
    constructor() {
        super();
        this._bulkHandler = (requests) => requests.map(() => ({ status: 200, data: {} }));
        this._requestHandler = () =>
            new APIResponse({ status: 200, data: {}, path: '__mock__', method: 'get' });
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
