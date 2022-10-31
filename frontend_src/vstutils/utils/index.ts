export * from './todo.js';
export * from './app-helpers';

export enum HttpMethods {
    GET = 'get',
    POST = 'post',
    PUT = 'put',
    PATCH = 'patch',
    DELETE = 'delete',
}

export enum BulkType {
    SIMPLE = 'put',
    TRANSACTIONAL = 'post',
    ASYNC = 'patch',
}

/**
 * The maximum is exclusive and the minimum is inclusive
 */
export function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
}
