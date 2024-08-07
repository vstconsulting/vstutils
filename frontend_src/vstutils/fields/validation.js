export class ValidationError extends Error {}

export class FieldValidator {
    /**
     * @param {*} value
     * @param {import('../utils').RepresentData} data
     * @throws {ValidationError}
     */
    validate(value, data) {}
}
