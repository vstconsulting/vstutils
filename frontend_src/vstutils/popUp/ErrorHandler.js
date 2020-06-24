import { guiPopUp } from './PopUp';

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
                error_msg += '<b>{0}</b>:<br>{1}'.format(key, detail_msg);
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

        if (!error) {
            return result;
        }

        if (typeof error == 'string') {
            return error;
        }

        if (typeof error == 'object' && error.message) {
            return error.message;
        }

        if (typeof error == 'object' && error.data) {
            if (error.data.detail && typeof error.data.detail == 'string') {
                return error.data.detail;
            } else if (error.data.detail && typeof error.data.detail == 'object') {
                return this.errorDetailHandler(error.data.detail);
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
