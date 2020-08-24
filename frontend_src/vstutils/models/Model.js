import { isEmptyObject, obj_prop_retriever } from '../utils';
import { FKField } from '../fields/fk/fk';

/**
 * Class of Base Model.
 */
export default class Model {
    /**
     * @param name {string}
     * @param fields {Object.<string, BaseField>}
     */
    constructor(name, fields) {
        this.name = name;
        this.fields = fields;
        this.non_instance_attr = ['non_instance_attr', 'constructor', 'getInstance'];
        if (!isEmptyObject(this.fields)) {
            this.pk_name = Object.keys(this.fields)[0];
            for (let field in this.fields) {
                if (this.fields[field].options.is_pk) {
                    this.pk_name = field;
                    break;
                }
            }
            this.view_name = 'name';

            this.methodsToBulk = ['get', 'delete', 'put', 'patch', 'post'];
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
        if (this.fields[this.pk_name]) {
            return this.fields[this.pk_name].toInner(this.data);
        }
    }
    /**
     * Method, that returns instance's value of view field.
     */
    getViewFieldValue(defaultValue = '') {
        if (this.fields[this.view_name]) {
            return this.fields[this.view_name].toRepresent(this.data);
        } else if (Object.prototype.hasOwnProperty.call(this.fields, 'username')) {
            return this.fields.username.toRepresent(this.data);
        } else if (Object.prototype.hasOwnProperty.call(this.fields, 'email')) {
            return this.fields.email.toRepresent(this.data);
        }
        return defaultValue;
    }

    /**
     * Method to update model data
     *
     * @param {Model=} newDataInstance
     * @param {string=} method
     * @return {Promise.<Model>}
     */
    async update({ newDataInstance = this, method = undefined }) {
        return (await this.queryset.update(newDataInstance, [this], method))[0];
    }

    /**
     * Method, that sends api request to delete Model instance.
     *
     * @returns {Promise}
     */
    async delete() {
        return (await this.queryset.delete([this]))[0];
    }

    /**
     * Method, that returns model data, represented as FormData instance.
     *
     * @returns {FormData}
     */
    getFormData() {
        const data = this.toInner(this.data);
        const formData = new FormData();

        for (let [key, value] of Object.entries(data)) formData.append(key, value);

        return formData;
    }

    /**
     * Method, that creates new Model instance.
     *
     * @returns {Promise.<Model>}
     */
    create(method = 'post') {
        return this.queryset.create(this, method);
    }

    save(method = 'post') {
        if (!this.getPkValue()) {
            return this.create(method);
        }
        return this.update({ method });
    }

    /**
     * Method, that returns Model instance.
     * @param {object} data  Data of Model instance's fields.
     * @param {QuerySet} queryset Queryset for current Model instance.
     * @returns {Model}
     */
    getInstance(data, queryset) {
        const qs = queryset.clone();
        qs.query = {};

        let instance = {
            data: data,
            queryset: qs,
        };

        for (let key in this) {
            if (Object.prototype.hasOwnProperty.call(this, key) && !this.non_instance_attr.includes(key)) {
                instance[key] = this[key];
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
     * @returns {string[]} fields Array with names of prefetch fields.
     */
    getPrefetchFields() {
        let fields = [];

        for (let key in this.fields) {
            if (Object.prototype.hasOwnProperty.call(this.fields, key)) {
                let field = this.fields[key];
                if (field instanceof FKField) {
                    fields.push(key);
                }
            }
        }

        return fields;
    }
}
