/**
 * Class, that is responsible for loading of OpenAPI schema.
 * Class has methods for loading of OpenAPI schema from API as well as from cache.
 */
class OpenAPILoader {
    /**
     * Constructor of OpenApiLoader class.
     * @param {object} cache Object, that methods for manipulating with indexedDB. Instance of FilesCache.
     */
    constructor(cache) {
        /**
         * Object, that methods for manipulating with indexedDB. Instance of FilesCache.
         */
        this.cache = cache;
        this.cacheKey = 'openapi';
    }

    /**
     * Method, that promises to load OpenApi schema from API.
     * @return {Promise} Promise of loading of OpenApi schema from API.
     */
    loadSchemaFromApi() {
        return fetch(window.endpoint_url + '?format=openapi').then((res) => {
            if (!res.ok) {
                throw new Error('API request for loading of OpenAPI schema failed.');
            }

            return res.json();
        });
    }

    /**
     * Method, that promises to load OpenApi schema.
     * @return {Promise<unknown>} Promise of OpenApi schema loading.
     */
    async loadSchema() {
        const cached = await this.cache.getJson(this.cacheKey);
        if (cached) {
            return cached;
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

export default OpenAPILoader;
