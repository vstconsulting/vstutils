export class ValidationError extends Error {}

export class FieldValidator {
    /**
     * @param {*} value
     * @param {RepresentData} data
     * @throws {ValidationError}
     */
    validate(value, data) {}
}
