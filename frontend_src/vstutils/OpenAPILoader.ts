import { createApiFetch } from '@/vstutils/api-fetch';
import { InitAppConfig } from './init-app';
import { type AppSchema } from './schema';

export default class OpenAPILoader {
    config: InitAppConfig;

    constructor({ config }: { config: InitAppConfig; anon?: boolean }) {
        this.config = config;
    }

    async loadSchema(): Promise<AppSchema> {
        const apiFetch = createApiFetch({ config: this.config });
        const res = await apiFetch(new URL('endpoint/?format=openapi', this.config.api.url));
        if (!res.ok) {
            throw new Error('API request for loading of OpenAPI schema failed.');
        }
        return res.json();
    }
}
