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

/**
 * Class, that is responsible for setting/getting files' content (strings, json - transformed to string) to/from cache.
 * In current realization of VST Utils cache is stored in the indexedDB.
 * More about indexedDB:
 * - https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Concepts_Behind_IndexedDB
 * - https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 */
class IndexedDBCache extends FakeCache {
    constructor() {
        super();
        this.indexed_db =
            window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        if (!this.indexed_db) throw new Error('IndexedDB is not supported by current environment');

        this.db_name = 'cache_' + window.host_url.replace(/[^0-9A-z]/gim, '_') + '__';
        this.db_version = 1;
        this.store_name = 'cache_store';
        /**
         * @type {IDBDatabase}
         */
        this.db = undefined;
    }

    /**
     * Method, that returns promise opening connection to cache
     *
     * @returns {Promise<IndexedDBCache>}
     */
    async connect() {
        return new Promise((resolve, reject) => {
            let request = this.indexed_db.open(this.db_name, this.db_version);

            request.onerror = (err) => {
                console.error('Error while connecting to indexDB', err);
                reject(err);
            };

            // eslint-disable-next-line no-unused-vars
            request.onsuccess = (event) => {
                this.db = request.result;

                this.db.onerror = function (event) {
                    console.log('indexedDB - db.onerror ', event);
                };

                resolve(this);
            };

            // eslint-disable-next-line no-unused-vars
            request.onupgradeneeded = (event) => {
                this.db = request.result;
                this.db.createObjectStore(this.store_name, { keyPath: 'path', autoIncrement: true });
                return this.connect().then(resolve, reject);
            };
        });
    }

    close() {
        this.db.close();
        this.db = undefined;
    }

    get(key) {
        return new Promise((resolve, reject) => {
            const get = () => {
                let transaction = this.db.transaction([this.store_name], 'readonly');
                let request = transaction.objectStore(this.store_name).get(key);

                request.onerror = (err) => {
                    console.error('Error in FilesCache.getFile()', err);
                    reject(err);
                };

                request.onsuccess = () => {
                    if (!request.result) {
                        reject();
                    }

                    resolve(request.result);
                };
            };

            if (this.db) {
                get();
            } else {
                this.connect()
                    .then(get)
                    .then(() => this.close());
            }
        });
    }

    set(key, value) {
        return new Promise((resolve, reject) => {
            const set = () => {
                let transaction = this.db.transaction([this.store_name], 'readwrite');

                transaction.onerror = (event) => {
                    console.error('Error in FilesCache.setFile().', event);
                };

                let objectStore = transaction.objectStore(this.store_name);

                let request = objectStore.put({ path: key, data: value });

                request.onerror = (err) => {
                    console.error('Error in FilesCache.setFile()', err);
                    reject(err);
                };

                request.onsuccess = () => {
                    if (!request.result) {
                        reject();
                    }
                    resolve(request.result);
                };
            };

            if (this.db) {
                set();
            } else {
                this.connect()
                    .then(set)
                    .then(() => this.close());
            }
        });
    }

    /**
     * Method, that returns promise to delete file from FilesCache instance's database.
     */
    delete(key) {
        return new Promise((resolve, reject) => {
            const del = () => {
                let transaction = this.db.transaction([this.store_name], 'readwrite');

                transaction.onerror = (event) => {
                    console.error('Error in FilesCache.delFile()', event);
                };

                let objectStore = transaction.objectStore(this.store_name);
                let request = objectStore.delete(key);

                request.onerror = (err) => {
                    console.error('Error in FilesCache.detFile()', err);
                    reject(err);
                };

                request.onsuccess = () => {
                    resolve(true);
                };
            };

            if (this.db) {
                return del();
            } else {
                this.connect()
                    .then(del)
                    .then(() => this.close());
            }
        });
    }

    clearAllCache() {
        return new Promise((resolve, reject) => {
            if (this.db) this.db.close();

            let DBDeleteRequest = this.indexed_db.deleteDatabase(this.db_name);

            DBDeleteRequest.onerror = (event) => {
                console.error("Error during 'deleteAllCache' method execution. ", event);
                reject(event);
            };

            DBDeleteRequest.onblocked = (event) => {
                resolve(event);
            };

            DBDeleteRequest.onsuccess = (event) => {
                resolve(event);
            };
        });
    }
}

async function getGlobalCache() {
    try {
        return new IndexedDBCache();
    } catch (e) {
        return new FakeCache();
    }
}

const cachePromise = getGlobalCache();

export { FakeCache, IndexedDBCache, cachePromise };
