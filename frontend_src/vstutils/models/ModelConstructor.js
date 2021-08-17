import $ from 'jquery';
import signals from '../signals.js';
import { StringField } from '../fields/text';
import { makeModel, Model, ModelClass } from './Model.js';
import { getFieldFormatFactory } from '../fields';

@ModelClass('NoModel')
export class NoModel extends Model {
    static declaredFields = [
        new StringField({
            format: 'string',
            name: 'detail',
            required: false,
            title: 'Detail',
            type: 'string',
        }),
    ];
}

/**
 * Class, that manages creation of guiModels.
 */
export default class ModelConstructor {
    /**
     * ModelConstructor is a class, that have methods for parsing of OpenAPI schema
     * and generating of Models objects based on the result of parsing.
     * @param {object} openapiDictionary.
     * @param {object} schema - Openapi schema.
     * @param {Map<string, Function>} fieldsClasses
     * @param {Map<string, Function>} modelsClasses
     */
    constructor(openapiDictionary, schema, fieldsClasses, modelsClasses) {
        this.dictionary = openapiDictionary;
        this.schema = schema;
        this.fieldsClasses = fieldsClasses;
        this.models = modelsClasses;
        this.getFieldFormat = getFieldFormatFactory(fieldsClasses);
    }

    /**
     * Method, that returns list of fields for current model.
     * @param {object} model OpenApi's Model schema.
     */
    _getModelFields(model) {
        const requiredFields = model[this.dictionary.models.required_fields.name] || [];
        const fields = model[this.dictionary.models.fields.name];

        for (let key in fields) {
            if (requiredFields.includes(key)) {
                fields[key].required = true;
            }
        }

        return fields;
    }

    /**
     * Method that generates fields for given model
     * @param {Object} modelSchema
     * @param {string} modelName
     * @return {BaseField[]}
     */
    _generateModelFields(modelSchema, modelName) {
        const fields = [];
        const schemaFields = this._getModelFields(modelSchema);

        signals.emit('models[' + modelName + '].fields.beforeInit', schemaFields);

        for (const [fieldName, fieldSchema] of Object.entries(schemaFields)) {
            const opt = {
                name: fieldName,
                format: this.getFieldFormat(fieldSchema),
            };

            const fieldConstructor = this.fieldsClasses.get(opt.format);

            fields.push(new fieldConstructor($.extend(true, {}, fieldSchema, opt)));
        }

        signals.emit('models[' + modelName + '].fields.afterInit', fields);

        return fields;
    }

    /**
     * Method that generates model class from schema
     * @param {string} modelName
     * @param {Object} modelSchema
     * @return {Function} Model class
     */
    _generateModel(modelName, modelSchema) {
        const fields = this._generateModelFields(modelSchema, modelName);

        return makeModel(
            class extends Model {
                static declaredFields = fields;
                static fieldsGroups = modelSchema['x-properties-groups'] || {};
                static viewFieldName = modelSchema['x-view-field-name'] || null;
                static nonBulkMethods = modelSchema['x-non-bulk-methods'] || null;
                static translateModel = modelSchema['x-translate-model'] || null;
            },
            modelName,
        );
    }

    /**
     * Method, that generates Models classes and sets to models map provided in the constructor
     */
    generateModels() {
        /**
         * Object where key is model name and value is model schema
         * @type {Object<string, Object>}
         */
        const schemaModels = this.schema[this.dictionary.models.name];

        for (const modelName in schemaModels) {
            if (
                !this.models.has(modelName) &&
                Object.prototype.hasOwnProperty.call(schemaModels, modelName)
            ) {
                const model = this._generateModel(modelName, schemaModels[modelName]);
                this.models.set(modelName, model);
                signals.emit(`models[${modelName}].created`, { model });
            }
        }

        this.models.set('NoModel', NoModel);

        signals.emit('allModels.created', { models: this.models });
    }
}
