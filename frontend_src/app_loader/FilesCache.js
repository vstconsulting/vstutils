/**
 * Class, that is responsible for setting/getting files' content (strings, json - transformed to string) to/from cache.
 * In current realization of VST Utils cache is stored in the indexedDB.
 * More about indexedDB:
 * - https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Concepts_Behind_IndexedDB
 * - https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 */
class FilesCache {
    /**
     * Constructor of FilesCache class.
     * @param {object} opt Object with options for FilesCache instance.
     */
    constructor(opt = {}) {
        this.indexed_db =
            window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        this.db_name = 'cache_' + window.host_url.replace(/[^0-9A-z]/gim, '_') + '__';
        this.db_version = 1;
        this.store_name = 'cache_store';

        Object.assign(this, opt);
    }

    /**
     * Method, that returns promise of getting connection to FilesCache instance's database.
     */
    connectDB() {
        this.connected = new Promise((resolve, reject) => {
            let request = this.indexed_db.open(this.db_name, this.db_version);

            request.onerror = (err) => {
                console.error('Error in FilesCache.connectDB().', err);
                reject(err);
            };

            // eslint-disable-next-line no-unused-vars
            request.onsuccess = (event) => {
                const db = request.result;

                db.onerror = function (event) {
                    console.log('indexedDB - db.onerror ', event);
                };

                resolve(db);
            };

            // eslint-disable-next-line no-unused-vars
            request.onupgradeneeded = (event) => {
                const db = request.result;
                db.createObjectStore(this.store_name, { keyPath: 'path', autoIncrement: true });
                return this.connectDB().then(resolve, reject);
            };
        });
        return this.connected;
    }

    /**
     * Method, that returns promise to get file from FilesCache instance's database.
     * @param {string} file_name Name of file.
     */
    getFile(file_name) {
        return new Promise((resolve, reject) => {
            this.connected.then((db) => {
                let transaction = db.transaction([this.store_name], 'readonly');
                let request = transaction.objectStore(this.store_name).get(file_name);

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
            });
        });
    }

    /**
     * Method, that returns promise to save file in FilesCache instance's database.
     * @param {string} file_name Name of file.
     * @param {string} file_data Content of file.
     */
    setFile(file_name, file_data) {
        return new Promise((resolve, reject) => {
            this.connected.then((db) => {
                let transaction = db.transaction([this.store_name], 'readwrite');

                transaction.onerror = (event) => {
                    console.error('Error in FilesCache.setFile().', event);
                };

                let objectStore = transaction.objectStore(this.store_name);

                let request = objectStore.put({ path: file_name, data: file_data });

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
            });
        });
    }

    /**
     * Method, that returns promise to delete file from FilesCache instance's database.
     */
    delFile(file_name) {
        return new Promise((resolve, reject) => {
            this.connected.then((db) => {
                let transaction = db.transaction([this.store_name], 'readwrite');

                transaction.onerror = (event) => {
                    console.error('Error in FilesCache.delFile()', event);
                };

                let objectStore = transaction.objectStore(this.store_name);
                let request = objectStore.delete(file_name);

                request.onerror = (err) => {
                    console.error('Error in FilesCache.detFile()', err);
                    reject(err);
                };

                request.onsuccess = () => {
                    resolve(true);
                };
            });
        });
    }

    /**
     * Method, that returns promise to delete all files from FilesCache instance's database
     * (delete FilesCache instance's database).
     */
    deleteAllCache() {
        return new Promise((resolve, reject) => {
            this.connected.then((db) => {
                db.close();

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
        });
    }
}

/**
 * Variable, that stores FilesCache instance.
 */
let guiCache = new FilesCache();
guiCache.connectDB();

export { FilesCache, guiCache };
