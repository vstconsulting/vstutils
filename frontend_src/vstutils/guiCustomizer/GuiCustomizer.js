import $ from 'jquery';
import { guiLocalSettings } from '../utils';
import { guiPopUp } from '../popUp';
import { _translate } from '../utils';
import { guiFields } from '../fields';
import { signals } from '../../libs/TabSignal.js';

/**
 * Class, that is responsible for changing GUI skins (themes) and for changing skins' settings.
 */
export default class GuiCustomizer {
    /**
     * Constructor of GuiCustomizer class.
     * @param {object} skin Object, that contains selected skin and it's current settings.
     * @param {object} skins Object with skins - objects,
     * that contain options for guiCustomizer form properties.
     * @param {object} custom_setting Object with user's custom settings for skins -
     * those settings could extend default skins values.
     */
    constructor(skin = {}, skins = {}, custom_setting = {}) {
        /**
         * This property should have following structure:
         * {
         *    name: 'skin_name',
         *    settings: {},
         * }
         * @type {Object}
         */
        this.skin = skin;
        /**
         * Property, that stores available skins.
         * @type {Object}
         */
        this.skins = skins;
        /**
         * Property, that stores user's custom settings for skins.
         * @type {Object}
         */
        this.skins_custom_settings = custom_setting;
        /**
         * Property, that stores options, that will be used in formField.options.form.
         * This object has options for formField real elements.
         * This object mixes skin options with form_base options.
         */
        this.form = undefined;
        /**
         * Property, that stores base options for formField.options.form.
         * These options should be available in every skin.
         */
        this.form_base = {
            custom_style: {
                title: 'Custom CSS',
                format: 'textarea',
                // priority: 901,
            },

            delete_settings: {
                title: 'Reset skin settings to default',
                text: 'Reset settings',
                format: 'button',
                // priority: 902,
                onclick: () => {
                    this.resetSkinSettingsAndUpdateCss();
                    guiPopUp.success(_translate('Skin settings were successfully reset to default.'));
                },
            },
            saveSkin: {
                title: 'Save skin',
                text: 'Save skin',
                format: 'button',
                // priority: 903,
                onclick: () => {
                    this.saveSkinSettings();
                    guiPopUp.success(_translate('Skin settings were successfully saved'));
                },
            },
        };
        /**
         * Property, that stores instance of guiField.form -
         * this field is responsible for representing skins setting to user.
         */
        this.formField = undefined;
        /**
         * Property, that stores instance of guiField.choices -
         * this field is responsible for representing name of selected skin to user.
         */
        this.skinField = undefined;
    }

    /**
     * Method, that initiates work of guiCustomizer.
     * It creates skin and form fields,
     * forms guiCustomizer form options.
     */
    init() {
        signals.emit('GuiCustomizer.beforeInit', this);

        // Creates skinField.
        this.skinField = new guiFields.choices({
            name: 'skin_name',
            title: 'Skin',
            format: 'choices',
            enum: Object.keys(this.skins),
        });

        // forms guiCustomizer form options.
        this.form = $.extend(true, {}, this.skins[this.skin.name], this.form_base);

        // Creates formField.
        this.formField = new guiFields.form({
            name: 'skin_settings',
            title: 'Skin settings',
            form: this.form,
        });

        signals.emit('GuiCustomizer.afterInit', this);
    }

    /**
     * Method, that forms string, which contains values of CSS variables,
     * based of skin.name and skin.settings.
     * @return {string}
     */
    formCss() {
        let css = '';

        let color_vars = [];

        for (let key in this.form) {
            if (!this.form[key].color_var) {
                continue;
            }

            if (!this.skin.settings[key]) {
                continue;
            }

            color_vars.push(this.form[key].color_var + ':' + this.skin.settings[key]);
        }

        css += '.gui-skin-' + this.skin.name + '{' + color_vars.join(';\n') + '}';

        if (this.skin.settings.custom_style) {
            css = css + '\n' + this.skin.settings.custom_style;
        }

        return css;
    }

    /**
     * Method, that deletes previous <style></style> DOM element
     * with CSS variables for previous skin
     * and appends new <style></style> DOM element with new styles.
     * @param {string} css New CSS.
     */
    replaceCss(css) {
        $('#currentSkin').remove();
        $('body').append("<style id='currentSkin' >" + css + '</style>');
    }

    /**
     * Method, that returns custom settings of current skin.
     */
    loadSkinCustomSettings() {
        let skin = this.skin.name;
        // let settings = guiLocalSettings.get('skins_settings');
        let settings = this.skins_custom_settings;

        if (settings && settings[skin]) {
            return settings[skin];
        }

        return {};
    }

    /**
     * Method, that adds current skin's custom_settings to original settings.
     */
    applySkinCustomSettings() {
        let settings = this.loadSkinCustomSettings();

        for (let key in settings) {
            if (!this.form[key]) {
                continue;
            }

            this.skin.settings[key] = settings[key];
        }

        this.skin.settings = { ...this.skin.settings };
    }

    /**
     * Method, that adds default settings of current skin to skin.settings.
     */
    applySkinDefaultSettings() {
        for (let key in this.form) {
            if (Object.prototype.hasOwnProperty.call(this.form, key)) {
                let val;

                if (this.form[key]) {
                    val = this.form[key].default;
                }

                this.skin.settings[key] = val;
                this.formField.options.form[key].default = val;

                this.skin.settings = { ...this.skin.settings };
            }
        }
    }

    /**
     * Method, that updates CSS variables, based on current skin settings
     * and changes <body></body> skin class.
     * Method, activates current skin settings.
     */
    updateCssVariables() {
        this.replaceCss(this.formCss());

        const body = $('body');
        let str = body.attr('class').replace(/gui-skin-[^ ]+/g, '') + ' gui-skin-' + this.skin.name + ' ';
        body.attr('class', str);
    }

    /**
     * Method, that resets custom skin settings to default.
     */
    resetSkinSettings() {
        let settings = guiLocalSettings.get('skins_settings') || {};

        delete settings[this.skin.name];

        this.skins_custom_settings = settings;

        guiLocalSettings.set('skins_settings', settings);

        signals.emit('GuiCustomizer.skins_custom_settings.reseted', this);
    }

    /**
     * Method, that saves custom skin settings.
     */
    saveSkinSettings() {
        let settings = this.skins_custom_settings;

        settings[this.skin.name] = $.extend(true, {}, this.skin.settings);

        this.skins_custom_settings = { ...settings };

        guiLocalSettings.set('skins_settings', settings);

        signals.emit('GuiCustomizer.skins_custom_settings.saved', this);
    }

    /**
     * Method, that resets custom skin settings to default
     * and updates skin settings.
     */
    resetSkinSettingsAndUpdateCss() {
        this.resetSkinSettings();

        this.updateSkinSettings();
    }

    /**
     * Method, that updates current skin settings.
     */
    updateSkinSettings() {
        this.applySkinDefaultSettings();

        this.applySkinCustomSettings();

        this.updateCssVariables();
    }

    /**
     * Method, that changes selected skin.
     * @param {string} skin Name of selected skin.
     */
    setSkin(skin) {
        this.form = $.extend(true, {}, this.skins[skin], this.form_base);

        this.updateSkinSettings();

        this.skin.name = skin;

        guiLocalSettings.set('skin', skin);

        signals.emit('GuiCustomizer.skin.name.changed', this);
    }

    /**
     * Method, that changes current skin settings.
     * @param {object} settings Object with new settings.
     */
    setSkinSettings(settings) {
        this.skin.settings = settings;
        this.skin.settings = { ...this.skin.settings };

        this.updateCssVariables();

        signals.emit('GuiCustomizer.skin.settings.changed', this);
    }
}
