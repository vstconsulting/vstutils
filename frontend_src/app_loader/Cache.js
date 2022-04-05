/**
 * Fake cache class
 */
class FakeCache {
    /**
     * Method, that returns promise opening connection to cache
     *
     * @returns {Promise<FakeCache>}
     */
    async connect() {
        return this;
    }

    close() {}

    /**
     * Method, that returns promise to get file from cache
     *
     * @param {string} key - Key of requested data.
     * @returns {Promise<string>} requested data
     */
    // eslint-disable-next-line no-unused-vars
    async get(key) {
        return Promise.reject();
    }

    /**
     * Set value to cache by key
     *
     * @param {string} key
     * @param {string} value
     * @returns {Promise}
     */
    // eslint-disable-next-line no-unused-vars
    async set(key, value) {}

    /**
     * Method, that returns promise to delete data from cache by key
     *
     * @returns {Promise}
     */
    // eslint-disable-next-line no-unused-vars
    async delete(key) {}

    /**
     * Method, that returns promise to delete all data from cache
     *
     * @returns {Promise}
     */
    async clearAllCache() {}
}

class StorageCache extends FakeCache {
    /**
     * @param {Storage} storage
     * @param {string=} prefix
     */
    constructor(storage, prefix = 'cache_') {
        super();
        this.storage = storage;
        this.prefix = prefix;
    }
    get(key) {
        const value = this.storage.getItem(this._getKey(key));
        if (value === null) {
            return Promise.reject();
        }
        return Promise.resolve({ data: value });
    }
    set(key, value) {
        try {
            this.storage.setItem(this._getKey(key), value);
        } catch {} // eslint-disable-line no-empty
        return Promise.resolve();
    }
    delete(key) {
        this.storage.removeItem(this._getKey(key));
        return Promise.resolve();
    }
    clearAllCache() {
        const keysToRemove = [];
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key.startsWith(this.prefix)) {
                keysToRemove.push(key);
            }
        }
        for (const key of keysToRemove) {
            this.storage.removeItem(key);
        }
        return Promise.resolve();
    }
    _getKey(key) {
        return this.prefix + key;
    }
}

async function getGlobalCache() {
    if ('localStorage' in window) {
        return new StorageCache(window.localStorage);
    }
    return new FakeCache();
}

const cachePromise = getGlobalCache();

export { FakeCache, StorageCache, cachePromise };
