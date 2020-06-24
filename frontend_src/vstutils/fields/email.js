import { _translate } from '../utils';
import { BaseFieldContentEdit } from './base';
import { StringField } from './text';

const EmailFieldMixin = {
    components: {
        field_content_edit: {
            mixins: [BaseFieldContentEdit],
            data() {
                return {
                    input_type: 'email',
                };
            },
        },
    },
};

/**
 * Email guiField class.
 */
class EmailField extends StringField {
    /**
     * Redefinition of string guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(EmailFieldMixin);
    }

    /**
     * Static property, that returns regExp for email string validation.
     * @return {RegExp}
     */
    static get validation_reg_exp() {
        return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    }

    /**
     * Redefinition of 'validateValue' method of string guiField.
     */
    validateValue(data = {}) {
        let value = super.validateValue(data);

        if (this.options.required && !this.constructor.validation_reg_exp.test(String(value))) {
            let title = (this.options.title || this.options.name).toLowerCase();
            let $t = _translate;

            let err_msg = '<b>"{0}"</b> field should be written in <b>"example@mail.com"</b> format.';

            throw {
                error: 'validation',
                message: $t(err_msg).format([$t(title)]),
            };
        }

        return value;
    }
}

export { EmailField, EmailFieldMixin };
