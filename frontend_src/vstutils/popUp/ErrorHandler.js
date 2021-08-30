import { guiPopUp } from './PopUp';
import { ModelValidationError } from '../utils';

const SPECIAL_ERRORS_KEYS = ['non_field_errors', 'other_errors'];

/**
 * Class, that handles errors.
 * Class can transform error to string add show error message to user.
 */
export default class ErrorHandler {
    /**
     * Constructor of ErrorHandler.
     */
    constructor() {}

    /**
     * Method translate object data to string, used for error details.
     * @param {*} detail
     */
    errorDetailHandler(detail) {
        let error_msg = '';
        for (let key in detail) {
            if (Object.prototype.hasOwnProperty.call(detail, key)) {
                let detail_msg = detail[key];
                if (Array.isArray(detail_msg)) {
                    detail_msg = detail_msg.join('<br>');
                }
                if (SPECIAL_ERRORS_KEYS.includes(key)) {
                    error_msg += `<br>${detail_msg}`;
                } else {
                    error_msg += `<br><b>${key}</b>: ${detail_msg}`;
                }
            }
        }
        return error_msg;
    }

    /**
     * Method, that transforms error to string.
     * @param {*} error.
     */
    errorToString(error) {
        let result = 'Unknown error';

        if (!error) return result;

        if (error instanceof ModelValidationError) {
            return error.toHtmlString();
        }

        if (typeof error == 'string') return error;

        if (typeof error == 'object' && error.message) {
            if (error.message.other_errors) {
                if (Array.isArray(error.message.other_errors)) {
                    return error.message.other_errors.join('<br/>');
                }
                return error.message.other_errors;
            }
            return error.message;
        }

        if (typeof error == 'object' && error.data) {
            if (error.data.detail && typeof error.data.detail == 'string') {
                return error.data.detail;
            } else if (error.data.detail && typeof error.data.detail == 'object') {
                return this.errorDetailHandler(error.data.detail);
            } else if (Array.isArray(error.data)) {
                return error.data.join('<br>');
            } else if (typeof error.data == 'object') {
                return this.errorDetailHandler(error.data);
            }
        }

        return result;
    }

    /**
     * Method, that shows error to user.
     * @param {string} to_pop_up String, that will be shown in pop up notification.
     * @param {string} to_console String, that will be logged into console.
     */
    showError(to_pop_up, to_console = undefined) {
        if (!to_console) {
            to_console = to_pop_up;
        }

        guiPopUp.error(to_pop_up);
        console.error(to_console);
    }
    /**
     * Method, that transforms error into string and shows ot to user.
     * @param {*} error
     */
    defineErrorAndShow(error) {
        return this.showError(this.errorToString(error));
    }
}
