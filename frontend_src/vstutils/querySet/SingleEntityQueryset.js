import QuerySet from './QuerySet.js';

class MethodNotImplemented extends Error {
    constructor() {
        super('Method is not implemented!');
    }
}

export class SingleEntityQueryset extends QuerySet {
    // eslint-disable-next-line no-unused-vars
    _getDetailPath(id) {
        return this.getDataType();
    }

    // eslint-disable-next-line no-unused-vars
    async get(id = undefined, pathParamsValues = null) {
        // Parameter of get must be not undefined so getOne would not be used
        return super.get('NOT_UNDEFINED', pathParamsValues);
    }

    // eslint-disable-next-line no-unused-vars
    async items(invalidateCache = true) {
        throw new MethodNotImplemented();
    }

    // eslint-disable-next-line no-unused-vars
    _getCreateBulkPath(pkFieldName) {
        return this.getDataType();
    }
}
