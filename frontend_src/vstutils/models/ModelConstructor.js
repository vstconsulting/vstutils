import { BaseEntityConstructor } from "../utils";

/**
 * Class, that manages creation of guiModels.
 */
export default class ModelConstructor extends BaseEntityConstructor {
    /**
     * Redefinition of BaseEntityConstructor class.
     * @param {object} openapi_dictionary.
     * @param {object} models_classes Dict with models classes.
     */
    constructor(openapi_dictionary, models_classes) {
        super(openapi_dictionary);
        this.pk_names = ['id'];
        this.classes = models_classes;
    }

    /**
     * Method, that returns Models list, from OpenApi schema.
     * @param {object} openapi_schema OpenApi schema.
     */
    getModelsList(openapi_schema) {
        return openapi_schema[this.dictionary.models.name];
    }

    /**
     * Method, that returns list of fields for current model.
     * @param {object} model OpenApi's Model schema.
     */
    getModelFieldsList(model) {
        let required_fields = this.getModelRequiredFieldsList(model);
        let fields = model[this.dictionary.models.fields.name];

        for(let key in fields) {
            if(required_fields.includes(key)) {
                fields[key].required = true;
            }
        }

        return fields;
    }

    /**
     * Method, that returns list of required fields' names for current model.
     * @param {object} model OpenApi's Model schema.
     */
    getModelRequiredFieldsList(model) {
        return model[this.dictionary.models.required_fields.name] || [];
    }

    /**
     * Method, that defines format of current field.
     * @param {object} field Field from OpenApi's Model schema.
     */
    getModelFieldFormat(field) {
        return this.getFieldFormat(field);
    }

    /**
     * Method, that returns object with guiFields for current Model.
     * Method defines appropriate guiField for every field from OpenApi's Model schema.
     * @param {object} model OpenApi's Model schema.
     * @param {string} name Model name.
     */
    generateModelFields(model, model_name) {
        let f_obj = {};
        let fields = this.getModelFieldsList(model);

        tabSignal.emit("models[" + model_name + "].fields.beforeInit", fields);

        for(let field in fields){
            if(fields.hasOwnProperty(field)) {
                let format = this.getModelFieldFormat(fields[field]);
                let opt = {
                    name: field,
                    format: format,
                };

                if (this.pk_names.includes(field)) {
                    opt.is_pk = true;
                }

                f_obj[field] = new guiFields[format]($.extend(true, {}, fields[field], opt));
            }
        }

        tabSignal.emit("models[" + model_name + "].fields.afterInit", f_obj);

        return f_obj;
    }

    /**
     * Method, that returns Model class (Model Constructor).
     * @param {string} model Name of Model.
     */
    getModelsConstructor(model) {
        if(this.classes[model + "Model"]) {
            return this.classes[model + "Model"];
        }

        return this.classes.Model;
    }

    /**
     * Method, that generates Models objects based on OpenApi schema.
     * Method returns dict with generating models.
     * @param {object} openapi_schema OpenApi Schema.
     * @return {object} Models store - object, that contains generated Models.
     */
    generateModels(openapi_schema) {
        let store = {};
        let models = this.getModelsList(openapi_schema);

        for(let model in models){
            if(models.hasOwnProperty(model)) {
                let constructor = this.getModelsConstructor(model);

                store[model] = new constructor(
                    model, this.generateModelFields(models[model], model),
                );

                tabSignal.emit("models[" + model + "].created", {model: store[model]});
            }
        }

        tabSignal.emit("allModels.created", {models: store});

        return store;
    }
}
