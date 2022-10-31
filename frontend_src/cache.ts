export interface Cache {
    get(key: string): Promise<string | undefined>;
    getJson<T>(key: string): Promise<T | undefined>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}

export class DummyCache implements Cache {
    get(key: string): Promise<string | undefined> {
        return Promise.resolve(undefined);
    }

    getJson<T>(key: string): Promise<T | undefined> {
        return Promise.resolve(undefined);
    }

    set(key: string, value: string): Promise<void> {
        return Promise.resolve();
    }

    delete(key: string): Promise<void> {
        return Promise.resolve();
    }

    clear(): Promise<void> {
        return Promise.resolve();
    }
}

export class StorageCache implements Cache {
    storage: Storage;
    prefix: string;

    constructor(storage: Storage, prefix = 'cache_') {
        this.storage = storage;
        this.prefix = prefix;
    }

    get(key: string): Promise<string | undefined> {
        const value = this.storage.getItem(this._getKey(key));
        if (value === null) {
            return Promise.resolve(undefined);
        }
        return Promise.resolve(value);
    }

    async getJson<T>(key: string): Promise<T | undefined> {
        const cached = await this.get(key);
        if (cached !== undefined) {
            return JSON.parse(cached) as T;
        }
        return;
    }

    set(key: string, value: string): Promise<void> {
        try {
            this.storage.setItem(this._getKey(key), value);
        } catch (error) {
            console.warn('Can not set cache value', error);
        }
        return Promise.resolve();
    }

    delete(key: string): Promise<void> {
        this.storage.removeItem(this._getKey(key));
        return Promise.resolve();
    }

    clear(): Promise<void> {
        const keysToRemove = [];
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key!.startsWith(this.prefix)) {
                keysToRemove.push(key);
            }
        }
        for (const key of keysToRemove) {
            this.storage.removeItem(key!);
        }
        return Promise.resolve();
    }

    _getKey(key: string) {
        return this.prefix + key;
    }
}

function isLocalStorageAvailable() {
    const test = 'test';
    try {
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

export function getCache(): Cache {
    if (isLocalStorageAvailable()) {
        return new StorageCache(window.localStorage);
    }
    return new DummyCache();
}

export const globalCache = getCache();
