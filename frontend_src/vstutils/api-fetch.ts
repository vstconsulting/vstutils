import type { InitAppConfig } from '@/vstutils/init-app';

type InternalFetch = (req: Request) => Promise<Response>;

interface CreateApiFetchParams {
    fetch?: typeof fetch;
    config: InitAppConfig;
}

export function createApiFetch({ config, fetch: _fetch = window.fetch }: CreateApiFetchParams): typeof fetch {
    return internalFetchToFetch(createOauth2Fetch(config, _fetch));
}

function addHeadersToRequest(request: Request, headers: Record<string, string>): Request {
    const newHeaders = new Headers(request.headers);
    for (const [key, value] of Object.entries(headers)) {
        newHeaders.set(key, value);
    }
    return new Request(request, { headers: newHeaders });
}

function createOauth2Fetch(config: InitAppConfig, _fetch: InternalFetch): InternalFetch {
    const userManager = config.auth.userManager;
    return async (request: Request) => {
        let user = await userManager.getUser();
        if (!user || user.expired) {
            user = await userManager.signinSilent();
        }
        if (!user) {
            throw new Error('User is not logged in');
        }
        return _fetch(
            addHeadersToRequest(request, { Authorization: `${user.token_type} ${user.access_token}` }),
        );
    };
}

function internalFetchToFetch(_fetch: InternalFetch): typeof fetch {
    return function fetch(input: RequestInfo | URL, init?: RequestInit) {
        return _fetch(new Request(input, init));
    };
}
