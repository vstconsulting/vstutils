export interface ListResponseData<T = unknown> {
    count: number;
    results: T[];
    next: string | null;
    previous: string | null;
    [key: string]: unknown;
}
