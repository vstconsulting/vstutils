import QuerySet from './QuerySet.js';

class MethodNotImplemented extends Error {
    constructor() {
        super('Method is not implemented!');
    }
}

export class SingleEntityQueryset extends QuerySet {
    _getDetailPath(id) {
        return this.getDataType();
    }

    async get(id = undefined, pathParamsValues = null) {
        // Parameter of get must be not undefined so getOne would not be used
        return super.get('NOT_UNDEFINED', pathParamsValues);
    }

    async items(invalidateCache = true) {
        throw new MethodNotImplemented();
    }

    _getCreateBulkPath(pkFieldName) {
        return this.getDataType();
    }
}
