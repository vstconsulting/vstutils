import { guiFields } from '../fields';

/**
 * Class with common methods for ModelConstructor and ViewConstructor classes.
 */
export default class BaseEntityConstructor {
    /**
     * Constructor of BaseEntityConstructor class.
     * @param {object} openapi_dictionary Dict, that has info about properties names in OpenApi Schema
     * and some settings for views of different types.
     */
    constructor(openapi_dictionary) {
        this.dictionary = openapi_dictionary;
    }

    /**
     * Method, that returns array with properties names,
     * that store reference to model.
     *
     * @return {Array}
     */
    getModelRefsProps() {
        return this.dictionary.models.ref_names;
    }

    /**
     * Method, that defines format of current field.
     * @param {object} field Object with field options.
     */
    getFieldFormat(field) {
        if (guiFields[field.format]) {
            return field.format;
        }

        if (field.enum) {
            return "choices";
        }

        let props = Object.keys(field);
        let refs = this.getModelRefsProps();

        for (let key in props) {
            if (refs.includes(props[key])) {
                return 'api_object';
            }
        }

        if (guiFields[field.type]) {
            return field.type;
        }

        return 'string';
    }
}
