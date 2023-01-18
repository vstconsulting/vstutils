import { signals } from '@/vstutils/signals';
import { BaseField } from '@/vstutils/fields/base';

import { Model } from './Model';
import { makeModel } from './utils';

import type { FieldsResolver } from '@/vstutils/fields';
import type { AppSchema, ModelDefinition } from '@/vstutils/AppConfiguration';

const REF_PROPERTY = '$ref';

export class ModelsResolver {
    _definitionsModels = new Map<string, typeof Model>();
    protected _modelNameSeq = 1;

    constructor(protected fieldsResolver: FieldsResolver, protected schema: AppSchema) {}

    get(value: string | ModelDefinition): typeof Model {
        if (typeof value === 'string') {
            if (this._definitionsModels.has(value)) {
                return this._definitionsModels.get(value)!;
            }
        } else if (typeof value === 'object') {
            return this.bySchemaObject(value);
        }
        return this.byReferencePath(value);
    }

    /**
     * Resolves model by reference path
     */
    byReferencePath(reference: string): typeof Model {
        const name = reference.split('/').pop();
        if (name) {
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

        throw new Error(`Invalid model ref ${reference}`);
    }

    /**
     * Resolves model by schema object. Schema object or $ref is supported.
     * @see {@link https://swagger.io/specification/v2/#schemaObject}
     */
    bySchemaObject(modelSchema: ModelDefinition, modelName?: string): typeof Model {
        if (modelSchema[REF_PROPERTY]) {
            return this.byReferencePath(modelSchema[REF_PROPERTY]);
        }
        return this.createModel(modelSchema, modelName || this.generateModelName());
    }

    protected generateModelName() {
        return `NoNameModel${this._modelNameSeq++}`;
    }

    protected createModel(modelSchema: ModelDefinition, modelName: string): typeof Model {
        const properties = modelSchema.properties ?? {};

        // Set required
        const requiredProperties = modelSchema.required ?? [];

        signals.emit('models[' + modelName + '].fields.beforeInit', properties);

        const fields = Object.entries(properties).map(([fieldName, fieldSchema]) => {
            const field =
                fieldSchema instanceof BaseField
                    ? fieldSchema
                    : this.fieldsResolver.resolveField(Object.assign({}, fieldSchema), fieldName);
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
