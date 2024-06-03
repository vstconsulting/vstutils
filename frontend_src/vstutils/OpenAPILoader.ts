import { createApiFetch } from '@/vstutils/api-fetch';
import { InitAppConfig } from './init-app';
import { Cache } from '@/cache';
import { type AppSchema } from './schema';

/**
 * Class, that is responsible for loading of OpenAPI schema.
 * Class has methods for loading of OpenAPI schema from API as well as from cache.
 */
export default class OpenAPILoader {
    config: InitAppConfig;
    cacheKey: string;
    cache: Cache;
    anon: boolean;

    constructor({ config, anon }: { config: InitAppConfig; anon?: boolean }) {
        /**
         * Object, that methods for manipulating with indexedDB. Instance of FilesCache.
         */
        this.cache = config.cache;
        this.config = config;
        this.anon = anon ?? false;
        this.cacheKey = anon ? 'openapi-anon' : 'openapi';
    }

    async loadSchemaFromApi(): Promise<AppSchema> {
        const apiFetch = this.anon ? fetch : createApiFetch({ config: this.config });
        const res = await apiFetch(new URL('endpoint/?format=openapi', this.config.api.url));
        if (!res.ok) {
            throw new Error('API request for loading of OpenAPI schema failed.');
        }
        return res.json();
    }

    async loadSchema(): Promise<AppSchema> {
        const cached = await this.cache.getJson(this.cacheKey);
        if (cached) {
            return cached as AppSchema;
        }
        try {
            const schema = await this.loadSchemaFromApi();
            this.cache.set(this.cacheKey, JSON.stringify(schema));
            return schema;
        } catch (error) {
            console.error('Some error occurred during attempt of getting of OpenAPI schema.');
            throw error;
        }
    }
}
