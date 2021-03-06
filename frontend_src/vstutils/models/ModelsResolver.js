const REF_PROPERTY = '$ref';

export class ModelsResolver {
    /**
     * @param {Map<string, Function<Model>>} modelsClasses
     * @param {Map<string, BaseField>} fieldsClasses
     * @param {Object} schema
     */
    constructor(modelsClasses, fieldsClasses, schema) {
        this.modelsClasses = modelsClasses;
        this.fieldsClasses = fieldsClasses;
        this.schema = schema;
    }

    /**
     * Resolves model by reference path
     * @param {string} reference
     * @return {Function<Model>|undefined}
     */
    byReferencePath(reference) {
        return this.modelsClasses.get(reference.split('/').pop());
    }

    /**
     * Resolves model by schema object. Now $ref only is supported.
     * @param {Object} object
     * @return {Function<Model>|undefined}
     * @see {@link https://swagger.io/specification/v2/#schemaObject}
     */
    bySchemaObject(object) {
        if (object[REF_PROPERTY]) {
            return this.byReferencePath(object[REF_PROPERTY]);
        }
        throw Error('Only resolving by reference is supported');
    }
}
