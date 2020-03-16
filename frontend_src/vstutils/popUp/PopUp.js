import iziToast from "izitoast";

/**
 * Class, that is responsible for showing of pop up notification.
 */
export class PopUp {
    /**
     * Constructor of PopUp class.
     * @param {object} options Object with pop up settings.
     */
    constructor(options) {
        this.options =  {
            default: {maxWidth: 500, position: "topRight"},
            info: {title: "Info"},
            success: {title: "OK"},
            warning: {title: "Caution"},
            error: {title: "Error"},
            question: {
                timeout: false, close: true, overlay: true, position: 'center',
                displayMode: 'once', zindex: 2999, title: 'Question',
            },
        };

        this.options = Object.assign(this.options, options);

    }
    /**
     * Method, that forms settings for new pop up notification.
     * @param {string} key Type of pop up notification.
     * @param {object} opt Object with custom settings of new pop up notification.
     * @private
     */
    _getPopUpSettings(key, opt={}) {
        let base = this.options['default'] || {};
        let custom = this.options[key] || {};

        return Object.assign({}, base, custom, opt);
    }
    /**
     * Method, that shows new pop up notification.
     * @param {string} type Type of pop up notification.
     * @param {object} opt Object with settings of pop up notification.
     * @private
     */
    _showPopUp(type, opt) {
        if(!iziToast[type]) {
            type="show";
        }

        return iziToast[type](opt);
    }
    /**
     * Method, that forms settings for new pop up notification and shows it.
     * @param {string} type Type of pop up notification.
     * @param {string} message Text of pop up notification's body.
     * @param {object} opt Object with custom pop up notification's settings.
     * @private
     */
    _generatePopUp(type="show", message="", opt={}) {
        opt.message = message;
        return this._showPopUp(type, this._getPopUpSettings(type, opt));
    }
    /**
     * Method, that generates default pop up notification.
     * @param {string} message Body text of pop up notification.
     * @param {object} opt Object with custom settings for pop up notification.
     */
    default(message="", opt={}) {
        return this._generatePopUp("show", message, opt);
    }
    /**
     * Method, that generates info pop up notification.
     * @param {string} message Body text of pop up notification.
     * @param {object} opt Object with custom settings for pop up notification.
     */
    info(message="", opt={}) {
        return this._generatePopUp("info", message, opt);
    }
    /**
     * Method, that generates success pop up notification.
     * @param {string} message Body text of pop up notification.
     * @param {object} opt Object with custom settings for pop up notification.
     */
    success(message="", opt={}) {
        return this._generatePopUp("success", message, opt);
    }
    /**
     * Method, that generates warning pop up notification.
     * @param {string} message Body text of pop up notification.
     * @param {object} opt Object with custom settings for pop up notification.
     */
    warning(message="", opt={}) {
        return this._generatePopUp("warning", message, opt);
    }
    /**
     * Method, that generates error pop up notification.
     * @param {string} message Body text of pop up notification.
     * @param {object} opt Object with custom settings for pop up notification.
     */
    error(message="", opt={}) {
        return this._generatePopUp("error", message, opt);
    }
    /**
     * Method, that generates question pop up.
     * Returns promise of getting user's answer.
     * @param {string} message Question text.
     * @param {array} answer_buttons Array of strings - titles for answer buttons.
     * @param {object} opt Object with custom settings for question pop up.
     * @return {promise}.
     */
    question(message="", answer_buttons = [], opt={}) {
        let buttons = [];
        let success, fail;
        let answer = new Promise((resolve, reject) => {
            success = resolve;
            fail = reject;
        });

        answer_buttons.forEach(button => {
            buttons.push([
                '<button>' + button + '</button>',
                (instance, toast) => {
                    instance.hide({ transitionOut: "fadeOut" }, toast, button);
                },
            ]);
        });

        let options = {
            buttons: buttons,
            onClosed: (instance, toast, closedBy) => { /* jshint unused: false */
                if(answer_buttons.includes(closedBy)) {
                    return success(closedBy);
                }

                return fail(closedBy);
            }
        };

        options = Object.assign(options, opt);

        this._generatePopUp("question", message, options);

        return answer;
    }
}

/**
 * Global variable, that stores main PopUp class instance.
 */
export let guiPopUp = new PopUp();

/**
 * Dictionary with pop up messages samples.
 */
export let pop_up_msg = {
    instance: {
        success: {
            add: 'Child "<b>{0}</b>" instance was successfully added to parent list.',
            create: 'New "<b>{0}</b>" instance was successfully created.',
            remove: '<b>{1}</b> "<b>{0}</b>" was successfully removed.',
            save: 'Changes in <b>{1}</b> "<b>{0}</b>" were successfully saved.',
            execute: 'Action "<b>{0}</b>" was successfully executed' +
            ' on "<b>{1}</b>".',
        },
        error: {
            add: 'Some error occurred during adding of child "<b>{0}</b>" instance' +
            ' to parent list.' + '<br> Error details: {1}',
            create: 'Some error occurred during new "<b>{0}</b>" instance creation.' +
            '<br> Error details: {1}',
            remove: 'Some error occurred during remove process of <b>{1}</b>  "<b>{0}</b>".' +
            '<br> Error details: {2}',
            save: 'Some error occurred during saving process of <b>{1}</b> "<b>{0}</b>".' +
            '<br> Error details: {2}',
            execute: 'Some error occurred during "<b>{0}</b>" action execution on <b>{1}</b>.' +
            '<br> Error details: {2}',
        },
    },
    field: {
        error: {
            empty: 'Field "<b>{0}</b>" is empty.',
            required: 'Field "<b>{0}</b>" is required.',
            minLength: 'Field "<b>{0}</b>" is too short.' +
            '<br> Field length should not be shorter, than {1}.',
            maxLength: 'Field "<b>{0}</b>" is too long. ' +
            '<br> Field length should not be longer, than {1}.',
            min: 'Field "<b>{0}</b>" is too small.'+
            '<br> Field should not be smaller, than {1}.',
            max: 'Field "<b>{0}</b>" is too big.' +
            '<br> Field should not be bigger, than {1}.',
            invalid: '<b>{0} </b> value is not valid for <b>{1}</b> field.',
        },
    },
};
