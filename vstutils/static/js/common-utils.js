// List of Gui Testing Files
if(!window.guiTestsFiles) {
    window.guiTestsFiles = [];
}

// Adds files with tests to common list.
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/qUnitTest.js');
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/guiCommon.js');
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/guiFields.js');
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/guiSignals.js');
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/guiTests.js');
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/guiUsers.js');

// Runs tests
function loadQUnitTests() {
    loadAllUnitTests(window.guiTestsFiles);
}

// Loads and runs tests in strict order.
function loadAllUnitTests(urls) {
    let promises = [];

    for(let index in urls) {
        let promise_callbacks = {
            resolve: undefined,
            reject: undefined,
        };

        promises.push(
            new Promise((resolve, reject) => {
                promise_callbacks.resolve = resolve;
                promise_callbacks.reject = reject;
            })
        );

        let link = document.createElement("script");
        link.setAttribute("type", "text/javascript");
        link.setAttribute("src", urls[index] + '?r=' + Math.random());

        link.onload = function(promise_callbacks) {
            return function() {
                promise_callbacks.resolve();
            }
        }(promise_callbacks);

        document.getElementsByTagName("head")[0].appendChild(link);


        break;
    }

    //@todo think about current function.
    Promise.all(promises).then(() => {
        // injectQunit();
        if(urls.length == 1) {
            return injectQunit();
        }


        urls.splice(0, 1);
        loadAllUnitTests(urls);
    });
}




/**
 * Function to replace {.+?} in string to variables sended to this function,
 * array and single variable set ordered inside string
 * associative array and iterable objects set value for keys that original string have
 * @param {*} takes array, associative array or single variable and insert it
 * @return {string} - return string with inserted arguments
 */
String.prototype.format = function() {
    let obj = this.toString();
    let arg_list;

    if(typeof arguments[0] == "object") {
        arg_list = arguments[0];
    } else if(arguments.length >= 1) {
        arg_list = Array.from(arguments);
    }

    for(let key of this.format_keys()) {
        if (arg_list[key] != undefined) {
            obj = obj.replace('{'+ key + '}', arg_list[key]);
        } else {
            throw "String don't have \'" + key + "\' key";
        }
    }

    return obj;
};

/**
 * Function search and return all `{key}` in string.
 * @return {array} array of {key} in string.
 */
String.prototype.format_keys = function() {
    let thisObj = this;
    let res = thisObj.match(/{([^\}]+)}/g);

    if(!res) {
        return [];
    }

    return res.map((item) =>{ return item.slice(1, item.length - 1) });
};

/**
 * Function, that removes spaces symbols from the begging and from the end of string.
 * @param {string} s.
 */
function trim(s) {
    if(s) return s.replace(/^ */g, "").replace(/ *$/g, "");
    return '';
}


/**
 * Function returns capitalized string - first char is in UpperCase, others - in LowerCase.
 * @param {string} string String, that should be capitalized.
 * @return {string}
 */
function capitalizeString(string) {
    if(!string) {
        return "";
    }

    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

/**
 * Function returns shorten version of string.
 * @param {string} string String, that should be shorten.
 * @param {number} valid_length Max length of string.
 * @return {string}
 */
function sliceLongString(string="", valid_length=100) {
    if(typeof string != "string") {
        return sliceLongString("" + string, valid_length);
    }

    let str = string.slice(0, valid_length);

    if(string.length > valid_length) {
        str += "...";
    }

    return str;
}

/**
 * Function returns true if object has no attributes, otherwise it returns false.
 * @param {object} obj Object, that should be checked.
 * @returns {boolean}
 */
function isEmptyObject(obj) {
    for(let key in obj) {
        if (obj.hasOwnProperty(key)) {
            return false;
        }
    }
    return true;
}

/**
 * Function forms names of CSS classes, based on input arguments, and return them.
 * @param {string} element Name of element.
 * @param {string} title Title of element
 * @param {string} type Type of element.
 * @return {string} String with CSS classes names.
 */
function addCssClassesToElement(element="", title, type) {
    element = element.replace(/[\s\/]+/g,'_');

    let class_list = element + " ";

    if(title) {
        title = title.replace(/[\s\/]+/g,'_');
        class_list += element + "-" + title + " ";
    }

    if(title && type) {
        type = type.replace(/[\s\/]+/g,'_');
        class_list += element + "-" + type + " ";
        class_list += element + "-" + type + "-" + title;
    }

    return class_list.toLowerCase();
}

/**
 * Callback for window.onresize event.
 */
window.onresize = function() {
    if(window.innerWidth > 991) {
        if(guiLocalSettings.get('hideMenu')) {
            $("body").addClass('sidebar-collapse');
        }

        if($("body").hasClass('sidebar-open')) {
            $("body").removeClass('sidebar-open');
        }
    } else {
        if($("body").hasClass('sidebar-collapse')) {
            $("body").removeClass('sidebar-collapse');
        }
    }
};

/**
 * Function saves 'hideMenu' options to guiLocalSettings.
 * Function is supposed to be called when push-menu button was clicked.
 */
function saveHideMenuSettings() {
    if(window.innerWidth > 991) {
        if($('body').hasClass('sidebar-collapse')) {
            guiLocalSettings.set('hideMenu', false);
        } else {
            guiLocalSettings.set('hideMenu', true);
        }
    }
}

/**
 * Class, that manages manipulations with Local Storage.
 * It is used for saving some users local settings to the one property(object) of Local Storage.
 */
class LocalSettings {
    /**
     * Constructor of LocalSettings Class.
     * @param {string} name Key of current LocalSettings, that will be used in Local Storage.
     */
    constructor(name) {
        this.name = name;
        /**
         * Property for storing current settings (including tmpSettings).
         */
        this.__settings = {};
        /**
         * Property for storing tmpSettings.
         */
        this.__tmpSettings = {};
        /**
         * Property for storing setting value, as it was before user set tmpSettings value.
         */
        this.__beforeAsTmpSettings = {};

        this.sync();
    }

    /**
     * Method syncs this.__settings property with data from window.localStorage[this.name].
     */
    sync() {
        if(window.localStorage[this.name]) {
            try {
                this.__settings = JSON.parse(window.localStorage[this.name]);
            } catch(e) {}
        }
    }

    /**
     * Method returns property, that is stored is local settings at 'name' key.
     * @param {string} name Key of property from local settings.
     */
    get(name) {
        return this.__settings[name];
    }

    /**
     * Method sets property value in local settings.
     * @param {string} name Key of property from local settings.
     * @param {*} value Value of property from local settings.
     */
    set(name, value) {
        this.__removeTmpSettings();
        this.__settings[name] = value;
        window.localStorage[this.name] = JSON.stringify(this.__settings);
        tabSignal.emit(this.name + '.' + name, {type:'set', name:name, value:value});
    }

    /**
     * Method deletes property, that is stored is local settings at 'name' key.
     * @param {string} name Key of property from local settings.
     */
    delete(name) {
        this.__removeTmpSettings();
        delete this.__settings[name];
        delete this.__tmpSettings[name];
        delete this.__beforeAsTmpSettings[name];
        window.localStorage[this.name] = JSON.stringify(this.__settings);
    }

    /**
     * Method sets property value in local settings, if it was not set before.
     * @param {string} name Key of property from local settings.
     * @param {*} value Value of property from local settings.
     */
    setIfNotExists(name, value) {
        if(this.__settings[name] === undefined) {
            this.__settings[name] = value;
        }
    }

    /**
     * Method sets temporary property value in local settings.
     * @param {string} name Key of property from local settings.
     * @param {*} value Temporary Value of property from local settings.
     */
    setAsTmp(name, value) {
        if(this.__settings[name]) {
            this.__beforeAsTmpSettings[name] = this.__settings[name];
        }
        this.__settings[name] = value;
        this.__tmpSettings[name] = value;
        tabSignal.emit(this.name + '.' + name, {type:'set', name:name, value:value});
    }

    /**
     * Method removes tmpSettings from current settings and add previous values (if they were).
     */
    __removeTmpSettings() {
        for(let key in this.__tmpSettings) {
            if(this.__beforeAsTmpSettings[key]) {
                this.__settings[key] = this.__beforeAsTmpSettings[key];
            } else {
                delete this.__settings[key];
            }
        }
    }
}

/**
 * Object, that manages manipulations with Local Storage.
 */
var guiLocalSettings = new LocalSettings('guiLocalSettings');

/**
 * https://stackoverflow.com/a/25456134/7835270
 * @param {type} x
 * @param {type} y
 * @returns {Boolean}
 */
function deepEqual(x, y) {
    if((typeof x == "object" && x != null) && (typeof y == "object" && y != null)) {
        if(Object.keys(x).length != Object.keys(y).length) {
            return false;
        }

        for(let prop in x) {
            if(y.hasOwnProperty(prop)) {
                if(! deepEqual(x[prop], y[prop])) {
                    return false;
                }
            } else {
                return false;
            }
        }

        return true;
    } else if(x !== y) {
        return false;
    } else {
        return true;
    }
}

/**
 * Function checks string for keeping boolean value
 * @param {string} string - string, which we want to check on boolean value
 * @returns {Boolean}
 */
function stringToBoolean(string){
    if(string == null) {
        return false;
    }

    switch(string.toLowerCase().trim()) {
        case "true": case "yes": case "1": return true;
        case "false": case "no": case "0": case null: return false;
    }
}

/**
 * Function converts numbers from 0 to 9 into 00 to 09.
 * @param n(number) - number
 */
function oneCharNumberToTwoChar(n) {
    return n > 9 ? "" + n: "0" + n;
}

/**
 * Function checks that all properties of object are also objects.
 * @param {object} obj Some object.
 * @return {boolean}.
 */
function allPropertiesIsObjects(obj) {
    for(let prop in obj) {
        if(typeof obj[prop] != 'object') {
            return false;
        } else {
            if($.isArray(obj[prop])) {
                return false;
            }
        }
    }
    return true;
}

/*
 * 2 handlers, that removes CSS-class 'hover-li' from menu elements, after losing focus on them.
 */
$(".content-wrapper").hover(function() {
    $(".hover-li").removeClass("hover-li");
});

$(".navbar").hover(function() {
    $(".hover-li").removeClass("hover-li");
});

/**
 * Function converts color from hex to rgba.
 */
function hexToRgbA(hex, alpha) {
    if(alpha === undefined) {
        alpha = 1;
    }

    if(typeof(alpha) != "number") {
        alpha = Number(alpha);
        if(isNaN(alpha)) {
            alpha = 1;
        }
    }

    if(alpha < 0 || alpha > 1) {
        alpha = 1;
    }

    let c;

    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');

        if(c.length == 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }

        c = '0x'+ c.join('');

        return 'rgba('+ [(c>>16)&255, (c>>8)&255, c&255].join(',') + ',' + alpha + ')';
    }

    return;
}

/**
 * Function returns time in uptime format.
 * @param time {number} - time in seconds.
 */
function getTimeInUptimeFormat(time) {
    if(isNaN(time)) {
        return "00:00:00";
    }

    let uptime = moment.duration(Number(time), 'seconds')._data;

    let n = oneCharNumberToTwoChar;

    if(uptime.years > 0) {
        return n(uptime.years) + "y " + n(uptime.months) + "m " + n(uptime.days) + "d " + n(uptime.hours) + ":" +
            n(uptime.minutes) + ":" + n(uptime.seconds);
    } else if(uptime.months > 0) {
        return n(uptime.months) + "m " + n(uptime.days) + "d " + n(uptime.hours) + ":" + n(uptime.minutes) + ":" +
            n(uptime.seconds);
    } else if(uptime.days > 0) {
        return n(uptime.days) + "d " + n(uptime.hours) + ":" + n(uptime.minutes) + ":" + n(uptime.seconds);
    } else {
        return n(uptime.hours) + ":" + n(uptime.minutes) + ":" + n(uptime.seconds);
    }
}

Object.defineProperty(Array.prototype, 'last', {
    get: function() {
        return this[this.length - 1];
    }
});

/**
 * Class, that defines enumerable and non_enumerable properties of some object.
 * This class make recursive search in all chain of object prototypes.
 * For example, we have some object, that is instance of SomeClass2.
 * SomeClass2 is a child of SomeClass1.
 * SomeClass1 is a child of Object Class.
 * So, ObjectPropertyRetriever will find all properties of SomeClass2, SomeClass1, Object
 * prototypes.
 */
class ObjectPropertyRetriever {
    /**
     * Constructor of ObjectPropertyRetriever Class.
     */
    constructor() {
        /**
         * This property, stores enumerable properties
         * of Object Class constructor prototype.
         */
        this.ob_proto_attrs = this.constructor.getObjectConstructorProperties;
        /**
         * This property, stores non_enumerable properties
         * of Object Class constructor prototype.
         */
        this.obj_proto_methods = this.constructor.getObjectConstructorMethods;
    }
    /**
     * Static property, that returns enumerable properties
     * of Object Class constructor prototype.
     */
    static get getObjectConstructorMethods() {
        return Object.getOwnPropertyNames({}.constructor.prototype);
    }
    /**
     * Static property, that returns non_enumerable properties
     * of Object Class constructor prototype.
     */
    static get getObjectConstructorProperties() {
        return Object.keys({}.constructor.prototype);
    }
    /**
     * Method, that returns true, if prop is enumerable property of obj.
     * Otherwise, returns false.
     * @param {object} obj Object, that we want to check.
     * @param {string} prop Property, that we want to check.
     * @returns {boolean}
     * @private
     */
    _enumerable(obj, prop) {
        return obj.propertyIsEnumerable(prop);
    }
    /**
     * Method, that returns true, if prop is non_enumerable property of obj.
     * Otherwise, returns false.
     * @param {object} obj Object, that we want to check.
     * @param {string} prop Property, that we want to check.
     * @returns {boolean}
     * @private
     */
    _notEnumerable(obj, prop) {
        return !obj.propertyIsEnumerable(prop);
    }
    /**
     * Method, that returns true, if prop is enumerable or non_enumerable property of obj.
     * @param {object} obj Object, that we want to check.
     * @param {string} prop Property, that we want to check.
     * @returns {boolean}
     * @private
     */
    _enumerableAndNotEnumerable(obj, prop) {
        return true;
    }
    /**
     * Method, that returns names of object properties, that satisfy search arguments.
     * @param {object} obj Object, that we want to check.
     * @param {boolean} iterateSelfBool Means, make search inside obj or not.
     * @param {boolean} iteratePrototypeBool Means, make search inside obj prototypes or not.
     * @param {function} includePropCb Method, that checks: property satisfies or not.
     * @private
     */
    _getPropertyNames(obj, iterateSelfBool, iteratePrototypeBool, includePropCb) {
        let props = [];

        do {
            if(iterateSelfBool) {
                Object.getOwnPropertyNames(obj).forEach(function (prop) {
                    if (props.indexOf(prop) === -1 && includePropCb(obj, prop)) {
                        props.push(prop);
                    }
                });
            }

            if(!iteratePrototypeBool) {
                break;
            }

            iterateSelfBool = true;

        } while (obj = Object.getPrototypeOf(obj));

        return props;
    }
    /**
     * Method, that returns obj's own enumerable properties.
     * @param {object} obj Object, that we want to check.
     */
    getOwnEnumerables(obj) {
        return this._getPropertyNames(obj, true, false, this._enumerable);
    }
    /**
     * Method, that returns obj's own non_enumerable properties.
     * @param {object} obj Object, that we want to check.
     */
    getOwnNonenumerables(obj) {
        return this._getPropertyNames(obj, true, false, this._notEnumerable);
    }
    /**
     * Method, that returns obj's own enumerable and non_enumerable properties.
     * @param {object} obj Object, that we want to check.
     */
    getOwnEnumerablesAndNonenumerables(obj) {
        return this._getPropertyNames(obj, true, false, this._enumerableAndNotEnumerable);
    }
    /**
     * Method, that returns obj's prototypes enumerable properties.
     * @param {object} obj Object, that we want to check.
     * @param {boolean} obj_proto Means, include or not properties of Object Class prototype.
     */
    getPrototypeEnumerables(obj, obj_proto=true) {
        let props = this._getPropertyNames(obj, false, true, this._enumerable);

        if(!obj_proto) {
            return props.filter(item => !this.ob_proto_attrs.includes(item));
        }

        return props;
    }
    /**
     * Method, that returns obj's prototypes non_enumerable properties.
     * @param {object} obj Object, that we want to check.
     * @param {boolean} obj_proto Means, include or not properties of Object Class prototype.
     */
    getPrototypeNonenumerables(obj, obj_proto=true) {
        let props = this._getPropertyNames(obj, false, true, this._notEnumerable);

        if(!obj_proto) {
            return props.filter(item => !this.obj_proto_methods.includes(item));
        }

        return props;
    }
    /**
     * Method, that returns obj's prototypes enumerable and non_enumerable properties.
     * @param {object} obj Object, that we want to check.
     * @param {boolean} obj_proto Means, include or not properties of Object Class prototype.
     */
    getPrototypeEnumerablesAndNonenumerables(obj, obj_proto=true) {
        let props = this._getPropertyNames(obj, false, true, this._enumerableAndNotEnumerable);

        if(!obj_proto) {
            return props.filter(item => !(
                this.obj_proto_methods.includes(item) || this.ob_proto_attrs.includes(item)
            ));
        }

        return props;
    }
    /**
     * Method, that returns obj's own and prototypes enumerable properties.
     * @param {object} obj Object, that we want to check.
     * @param {boolean} obj_proto Means, include or not properties of Object Class prototype.
     */
    getOwnAndPrototypeEnumerables(obj, obj_proto=true) {
        let props = this._getPropertyNames(obj, true, true, this._enumerable);

        if(!obj_proto) {
            return props.filter(item => !this.ob_proto_attrs.includes(item));
        }

        return props;
    }
    /**
     * Method, that returns obj's own and prototypes non_enumerable properties.
     * @param {object} obj Object, that we want to check.
     * @param {boolean} obj_proto Means, include or not properties of Object Class prototype.
     */
    getOwnAndPrototypeNonenumerables(obj, obj_proto=true) {
        let props = this._getPropertyNames(obj, true, true, this._notEnumerable);

        if(!obj_proto) {
            return props.filter(item => !this.obj_proto_methods.includes(item));
        }

        return props;
    }
    /**
     * Method, that returns obj's own and prototypes enumerable and non_enumerable properties.
     * @param {object} obj Object, that we want to check.
     * @param {boolean} obj_proto Means, include or not properties of Object Class prototype.
     */
    getOwnAndPrototypeEnumerablesAndNonenumerables(obj) {
        let props = this._getPropertyNames(obj, true, true, this._enumerableAndNotEnumerable);

        if(!obj_proto) {
            return props.filter(item => !(
                this.obj_proto_methods.includes(item) || this.ob_proto_attrs.includes(item)
            ));
        }

        return props;
    }
}

/**
 * Instance of ObjectPropertyRetriever class.
 */
var obj_prop_retriever = new ObjectPropertyRetriever();

/**
 * Class with common methods for ModelConstructor and ViewConstructor classes.
 */
class BaseEntityConstructor {
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
     */
    getModelRefsProps() {
        return this.dictionary.models.ref_names;
    }

    /**
     * Method, that defines format of current field.
     * @param {object} field Object with field options.
     */
    getFieldFormat(field){
        // if(field.enum && guiFields['choices']){
        //     return "choices";
        // }

        if(guiFields[field.format]) {
            return field.format;
        }

        if(field.enum && guiFields['choices']){
            return "choices";
        }

        let props = Object.keys(field);
        let refs = this.getModelRefsProps();

        for(let key in props) {
            if(refs.includes(props[key])) {
                return 'api_object';
            }
        }

        if(guiFields[field.type]){
            return field.type;
        }

        return 'string';
    }
}

/**
 * Function, that finds the most appropriate (closest) path from path array to current_path.
 * It's supposed, that values in 'paths' array' were previously sorted.
 * It's supposed, that 'paths' array does not contain all application paths.
 * @param {array} paths Array with paths({string}).
 * @param {string} current_path Path, based on which function makes search.
 */
function findClosestPath(paths, current_path) {
    let c_p_parts = current_path.replace(/^\/|\/$/g, "").split("/");

    let matches = [];

    for(let index in paths) {
        let path = paths[index];
        let path_paths = path.replace(/^\/|\/$/g, "").split("/");

        matches.push({
            path: path,
            match: 0,
        });

        for(let num in c_p_parts) {
            let item = c_p_parts[num];

            if(item == path_paths[num]) {
                matches.last.match ++;
            } else {
                break;
            }
        }
    }

    matches = matches.sort((a, b) => {
        // return a.match - b.match;
        return a.match - b.match + b.path.split("/").length - a.path.split("/").length;
    });

    if(matches.last && matches.last.path && matches.last.match > 0) {
        return matches.last.path;
    }
}

/**
 * Class, that saves status of current view, that is opened right now in current tab.
 * This class is used in gui tests.
 * This class helps to determine, that page was loaded completely.
 */
class CurrentView {
    /**
     * Constructor of CurrentView class.
     */
    constructor() {
        /**
         * Property, that means, that page is loading.
         */
        this.loading = null;
        /**
         * Property, that means, that page was loaded successfully.
         */
        this.success = null;
        /**
         * Property, that means, that page was loaded with error.
         * It stores error.
         */
        this.error = null;
        /**
         * Property, that stores promise, that current page will be loaded.
         */
        this.promise = null;
        /**
         * Property, that stores promise status.
         */
        this.promise_status = "";
        /**
         * Property, that stores promise callbacks.
         */
        this.promise_callbacks = {};
    }

    /**
     * Method, that inits loading of current view.
     */
    initLoading() {
        this.error = this.response = null;
        this.loading = true;

        this._initLoadingPromise();
    }

    /**
     * Method, that is called when page was loaded successfully.
     */
    setLoadingSuccessful() {
        this.loading = false;
        this.success = true;
        this.error = null;

        return setTimeout(() => {
            this.promise_callbacks.resolve();
            this.promise_status = 'resolved';
        }, 10);
    }

    /**
     * Method, that is called when page was loaded with error.
     */
    setLoadingError(error) {
        this.loading = false;
        this.success = null;
        this.error = error;

        return setTimeout(() => {
            this.promise_callbacks.reject();
            this.promise_status = 'rejected';
        }, 10);
    }

    /**
     * Method, that inits new instance of promise.
     * @private
     */
    _initLoadingPromise() {
        if(!(this.promise && (this.promise_status == "" || this.promise_status == "pending"))) {
            this.promise_callbacks = {
                resolve: undefined,
                reject: undefined,
            };

            this.promise = new Promise((resolve, reject) => {
                this.promise_callbacks.resolve = resolve;
                this.promise_callbacks.reject = reject;
            });

            this.promise_status = 'pending';
        }
    }
}

/**
 * Instance of CurrentView class, that is used in gui tests.
 */
var current_view = new CurrentView();

/**
 * Variable, that is responsible for 3rd level path keys.
 * For example, if path_pk_key == 'pk', all variables in js, that work with paths will contain current value:
 * - /user/{pk}/.
 * If path_pk_key == 'id':
 * - /user/{id}/.
 * It is supposed, that OpenAPI schema will use 'path_pk_key' value as pk_key for 3rd level paths.
 */
var path_pk_key = 'pk';