export class NotFoundError extends Error {
    /**
     * @param {string|number} pk
     * @param {QuerySet} qs
     */
    constructor(pk, qs) {
        super(`Instance with pk: ${pk} not found in queryset with url: ${qs.url}`);
    }
}
