import signals from '../signals.js';
import { makeModel, Model } from './Model.js';

const REF_PROPERTY = '$ref';

/**
 * @class ModelsResolver
 * Resolves model by reference path
 */
export class ModelsResolver {
    /**
     * @param {FieldsResolver} fieldsResolver
     * @param {Object} schema
     */
    constructor(fieldsResolver, schema) {
        this._definitionsModels = new Map();
        this.fieldsResolver = fieldsResolver;
        this.schema = schema;
        this._modelNameSeq = 1;
    }

    get(value) {
        if (typeof value === 'string') {
            if (this._definitionsModels.has(value)) {
                return this._definitionsModels.get(value);
            }
        } else if (typeof value === 'object') {
            return this.bySchemaObject(value);
        }
        return this.byReferencePath(value);
    }

    /**
     * Resolves model by reference path
     * @param {string} reference
     * @return {Function|undefined}
     */
    byReferencePath(reference) {
        const name = reference.split('/').pop();
        let model = this._definitionsModels.get(name);
        if (model) {
            return model;
        }
        const schema = this.schema.definitions[name];
        if (schema) {
            model = this.bySchemaObject(this.schema.definitions[name], name);
            this._definitionsModels.set(name, model);
            return model;
        }
    }

    /**
     * Resolves model by schema object. Schema object or $ref is supported.
     * @param {Object} modelSchema
     * @param {string} [modelName]
     * @return {Function}
     * @see {@link https://swagger.io/specification/v2/#schemaObject}
     */
    bySchemaObject(modelSchema, modelName) {
        if (modelSchema[REF_PROPERTY]) {
            return this.byReferencePath(modelSchema[REF_PROPERTY]);
        }
        return this._createModel(modelSchema, modelName || this._generateModelName());
    }

    _generateModelName() {
        return `NoNameModel${this._modelNameSeq++}`;
    }

    /**
     * @param {Object} modelSchema
     * @param {string} modelName
     * @return {Function}
     * @private
     */
    _createModel(modelSchema, modelName) {
        const properties = modelSchema.properties || {};

        // Set required
        const requiredProperties = modelSchema.required || [];

        signals.emit('models[' + modelName + '].fields.beforeInit', properties);

        const fields = Object.entries(properties).map(([fieldName, fieldSchema]) => {
            const field = this.fieldsResolver.resolveField({ ...fieldSchema }, fieldName);
            if (requiredProperties.includes(fieldName)) {
                field.required = true;
            }
            return field;
        });

        const model = makeModel(
            class extends Model {
                static declaredFields = fields;
                static fieldsGroups = modelSchema['x-properties-groups'] || null;
                static viewFieldName = modelSchema['x-view-field-name'] || null;
                static nonBulkMethods = modelSchema['x-non-bulk-methods'] || null;
                static translateModel = modelSchema['x-translate-model'] || null;
            },
            modelName,
        );

        signals.emit(`models[${modelName}].created`, { model });

        return model;
    }
}
