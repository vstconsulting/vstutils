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
    }

    /**
     * Method, that promises to load OpenApi schema from API.
     * @return {promise} Promise of loading of OpenApi schema from API.
     */
    loadSchemaFromApi() {
        return fetch(window.endpoint_url + '?format=openapi')
            .then((res) => {
                if (!res.ok) {
                    throw new Error('API request for loading of OpenAPI schema failed.');
                }

                return res.json();
            })
            .then((openapi) => {
                return openapi;
            });
    }

    /**
     * Method, that promises to load OpenApi schema from cache.
     * @return {promise} Promise of loading of OpenApi schema from Cache.
     */
    loadSchemaFromCache() {
        return this.cache
            .getFile('openapi')
            .then((response) => {
                return JSON.parse(response.data);
            })
            .catch((error) => {  /* jshint unused: false */
                return this.loadSchemaFromApi().then((openapi) => {
                    this.cache.setFile('openapi', JSON.stringify(openapi));
                    return openapi;
                });
            });
    }

    /**
     * Method, that promises to load OpenApi schema.
     * @return {promise} Promise of OpenApi schema loading.
     */
    loadSchema() {
        let method = this.cache ? 'loadSchemaFromCache' : 'loadSchemaFromApi';
        return this[method]()
            .then((openapi) => {
                return openapi;
            })
            .catch((error) => {
                console.error('Some error occurred during attempt of getting of OpenAPI schema.');
                throw error;
            });
    }
}

export default OpenAPILoader;
