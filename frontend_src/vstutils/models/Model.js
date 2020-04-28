import { guiFields } from '../fields';
import { isEmptyObject, obj_prop_retriever } from '../utils';

/**
 * Class of Base Model.
 */
export default class Model {
    constructor(name, fields) {
        this.name = name;
        this.fields = fields;
        this.non_instance_attr = ['non_instance_attr', 'constructor', 'getInstance'];
        if (!isEmptyObject(this.fields)) {
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
    toInner(form_data = this.data) {
        let data = {};
        for (let item in form_data) {
            if (this.fields[item]) {
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
        for (let item in api_data) {
            if (this.fields[item]) {
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
        if (this.fields[this.pk_name]) {
            return this.fields[this.pk_name].toInner(this.data);
        }
    }
    /**
     * Method, that returns instance's value of view field.
     */
    getViewFieldValue() {
        // return this.data[this.view_name];
        if (this.fields[this.view_name]) {
            return this.fields[this.view_name].toRepresent(this.data);
        } else if (this.fields.hasOwnProperty('username')) {
            return this.fields.username.toRepresent(this.data);
        } else if (this.fields.hasOwnProperty('email')) {
            return this.fields.email.toRepresent(this.data);
        }
    }
    /**
     * Method, that deletes Model instance.
     */
    delete() {
        let bulk = this.queryset.formBulkQuery('delete');
        if (bulk.path[bulk.path.length - 1] != this.getPkValue()) {
            bulk.path.push(this.getPkValue());
        }
        return this.queryset
            .sendQuery(bulk)
            .then((response) => {
                return response;
            })
            .catch((error) => {
                debugger;
                throw error;
            });
    }
    /**
     * Method, that saves Model instance's changes.
     */
    save(method = 'patch') {
        return this.queryset
            .formQueryAndSend(method, this.toInner(this.data))
            .then((response) => {
                return this.queryset.model.getInstance(response.data, this.queryset);
            })
            .catch((error) => {
                debugger;
                throw error;
            });
    }
    /**
     * Method, that returns Model instance.
     * @param {object} data  Data of Model instance's fields.
     * @param {object} queryset Queryset for current Model instance.
     */
    getInstance(data, queryset) {
        let instance = {
            data: data,
            queryset: queryset,
        };

        for (let key in this) {
            if (this.hasOwnProperty(key)) {
                if (!this.non_instance_attr.includes(key)) {
                    instance[key] = this[key];
                }
            }
        }

        let methods = obj_prop_retriever.getPrototypeNonenumerables(this, false);

        for (let index = 0; index < methods.length; index++) {
            let key = methods[index];
            if (!this.non_instance_attr.includes(key)) {
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

        for (let key in this.fields) {
            if (this.fields.hasOwnProperty(key)) {
                let field = this.fields[key];

                if (field instanceof guiFields.fk) {
                    fields.push(key);
                }
            }
        }

        return fields;
    }
}
