/**
 * Class, that manages manipulations with Local Storage.
 * It is used for saving some users local settings to the one property(object) of Local Storage.
 */
export class LocalSettings {
    /**
     * Constructor of LocalSettings Class.
     * @param {string} name Key name of Local Storage's property to which Local Settings will be saved.
     */
    constructor(name) {
        /**
         * Key name of Local Storage's property to which Local Settings will be saved.
         */
        this.name = name;
        /**
         * Property for storing current settings (including tmpSettings).
         */
        this.__settings = {};
        /**
         * Property for storing temporary settings.
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
        if (window.localStorage[this.name]) {
            try {
                this.__settings = JSON.parse(window.localStorage[this.name]);
            } catch (e) {}
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
        tabSignal.emit(this.name + '.' + name, { type: 'set', name: name, value: value });
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
        if (this.__settings[name] === undefined) {
            this.__settings[name] = value;
        }
    }

    /**
     * Method sets temporary property value in local settings.
     * @param {string} name Key of property from local settings.
     * @param {*} value Temporary Value of property from local settings.
     */
    setAsTmp(name, value) {
        if (this.__settings[name]) {
            this.__beforeAsTmpSettings[name] = this.__settings[name];
        }
        this.__settings[name] = value;
        this.__tmpSettings[name] = value;
        tabSignal.emit(this.name + '.' + name, { type: 'set', name: name, value: value });
    }

    /**
     * Method removes tmpSettings from current settings and add previous values (if they were).
     */
    __removeTmpSettings() {
        for (let key in this.__tmpSettings) {
            if (this.__beforeAsTmpSettings[key]) {
                this.__settings[key] = this.__beforeAsTmpSettings[key];
            } else {
                delete this.__settings[key];
            }
        }
    }
}
