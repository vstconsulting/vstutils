/**
 * Object, that contains Models classes.
 * Model class - constructor, that creates Models - JS objects.
 * This Model (JS object) is an abstraction aimed to be something similar to Django Models.
 * This Model can create Model instances (also JS Objects),
 * that aimed to be something similar to Django Model instances.
 */
let guiModels = {};

/**
 * Class of Base Model.
 */
guiModels.Model = class Model {
    constructor(name, fields){
        this.name = name;
        this.fields = fields;
        this.non_instance_attr = ['non_instance_attr','constructor', 'getInstance'];
        if(!isEmptyObject(this.fields)) {
            this.pk_name = Object.keys(this.fields)[0];
            for (let field in this.fields) {
                if (this.fields[field].options.is_pk) {
                    this.pk_name = field;
                }
            }
            this.view_name = 'name';
        }
    }
    /**
     * Method, that convert data from 'gui view' format into format, appropriate for API.
     * @param {object} form_data  Data from GUI form.
     */
    toInner(form_data = this.data){
        let data = {};
        for(let item in form_data) {
            if(this.fields[item]) {
                data[item] = this.fields[item].toInner(form_data);
            }
        }
        return data;
    }
    /**
     * Method, that convert data from API format into format, appropriate for 'gui view'.
     * @param {object} api_data Data from API.
     */
    toRepresent(api_data = this.data) {
        let data = {};
        for(let item in api_data) {
            if(this.fields[item]) {
                data[item] = this.fields[item].toRepresent(api_data);
            }
        }
        return data;
    }
    /**
     * Method, that returns instance's value of PK field.
     */
    getPkValue() {
        // return this.data[this.pk_name];
        if(this.fields[this.pk_name]) {
            return this.fields[this.pk_name].toInner(this.data);
        }
    }
    /**
     * Method, that returns instance's value of view field.
     */
    getViewFieldValue() {
        // return this.data[this.view_name];
        if(this.fields[this.view_name]) {
             return this.fields[this.view_name].toRepresent(this.data);
        }
    }
    /**
     * Method, that deletes Model instance.
     */
    delete(){
        let bulk = this.queryset.formBulkQuery('delete');
        if(bulk.data_type[bulk.data_type.length - 1] != this.getPkValue()) {
            bulk.data_type.push(this.getPkValue());
        }
        return this.queryset.sendQuery(bulk).then(response => {
            return response;
        }).catch(error => {
            debugger;
            throw error;
        });
    }
    /**
     * Method, that saves Model instance's changes.
     */
    save(method="patch"){
        return this.queryset.formQueryAndSend(method, this.toInner(this.data)).then(response => {
            return this.queryset.model.getInstance(response.data, this.queryset);
        }).catch(error => {
            debugger;
            throw error;
        });
    }
    /**
     * Method, that returns Model instance.
     * @param {object} data  Data of Model instance's fields.
     * @param {object} queryset Queryset for current Model instance.
     */
    getInstance(data, queryset){
        let instance = {
            data: data,
            queryset: queryset,
        };

        for(let key in this) {
            if(this.hasOwnProperty(key)) {
                if (!this.non_instance_attr.includes(key)) {
                    instance[key] = this[key];
                }
            }
        }

        let methods = obj_prop_retriever.getPrototypeNonenumerables(this, false); /* globals obj_prop_retriever */

        for(let index =0; index < methods.length; index++) {
            let key = methods[index];
            if(!this.non_instance_attr.includes(key)) {
                instance[key] = this[key];
            }
        }

        return instance;
    }

    /**
     * Method, that returns Array with prefetch fields' names of current model.
     * @returns {array} fields Array with names of prefetch fields.
     */
    getPrefetchFields() {
        let fields = [];

        for(let key in this.fields) {
            if(this.fields.hasOwnProperty(key)) {
                let field = this.fields[key];

                if (field instanceof guiFields.fk) {
                    fields.push(key);
                }
            }
        }

        return fields;
    }
};

/**
 * Class, that manages creation of guiModels.
 */
class ModelConstructor extends BaseEntityConstructor { /* jshint unused: false */
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