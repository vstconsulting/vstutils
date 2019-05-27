/**
 * Object, that stores application skins settings.
 */
var guiSkins = {};

/**
 * Default skin.
 */
guiSkins.default = {
    menu_active_bg_color:{
        color_var:"--menu-active-bg-color",
        title:'Active menu background',
        format:'color',
        default:"#0078ff",
        // priority: 0,
    },
    menu_active_color:{
        color_var:"--menu-active-color",
        title:'Active menu color',
        format:'color',
        default:"#ffffff",
        // priority: 1,
    },
    content_wrapper:{
        color_var:"--content-wrapper",
        title:'Body background',
        format:'color',
        default:"#ecf0f5",
        // priority: 2,
    },
    main_header_bg_color:{
        color_var:"--main-header-bg-color",
        title:'Top navigation background',
        format:'color',
        default:"#ffffff",
        // priority: 3,
    },
    main_border_color:{
        color_var:"--main-border-color",
        title:'Top navigation border',
        format:'color',
        default:"#dee2e6",
        // priority: 4,
    },
    left_sidebar_bg_color:{
        color_var:"--left-sidebar-bg-color",
        title:'Left sidebar background',
        format:'color',
        default:"#343a40",
        // priority: 5,
    },
    left_sidebar_border_color:{
        color_var:"--left-sidebar-border-color",
        title:'Left sidebar border',
        format:'color',
        default:"#4b545c",
        // priority: 6,
    },
    customizer_options_bg_color:{
        color_var:"--customizer-options-bg-color",
        title:'Customizer sidebar background',
        format:'color',
        default:"#343a40",
        // priority: 7,
    },
    breadcrumb_bg_color:{
        color_var:"--breadcrumb-bg-color",
        title:'Customizer sidebar background',
        format:'color',
        default:"#d2d6de",
        // priority: 8,
    },

    // default btn
    btn_default_bg_color:{
        color_var:"--btn-default-bg-color",
        title:'Buttons default background',
        format:'color',
        default:"#f4f4f4",
        // priority: 9,
    },
    btn_default_color:{
        color_var:"--btn-default-color",
        title:'Buttons default text',
        format:'color',
        default:"#444444",
        // priority: 10,
    },
    btn_default_border_color:{
        color_var:"--btn-default-border-color",
        title:'Buttons default border',
        format:'color',
        default:"#dddddd",
        // priority: 11,
    },

    // primary btn
    btn_primary_bg_color:{
        color_var:"--btn-primary-bg-color",
        title:'Buttons primary background',
        format:'color',
        default:"#3c75b3",
        // priority: 12,
    },
    btn_primary_color:{
        color_var:"--btn-primary-color",
        title:'Buttons primary text',
        format:'color',
        default:"#ffffff",
        // priority: 13,
    },
    btn_primary_border_color:{
        color_var:"--btn-primary-border-color",
        title:'Buttons primary border',
        format:'color',
        default:"#2a6fbc",
        // priority: 14,
    },

    // danger btn
    btn_danger_bg_color:{
        color_var:"--btn-danger-bg-color",
        title:'Buttons danger background',
        format:'color',
        default:"#dc3545",
        // priority: 15,
    },
    btn_danger_color:{
        color_var:"--btn-danger-color",
        title:'Buttons danger text',
        format:'color',
        default:"#ffffff",
        // priority: 16,
    },
    btn_danger_border_color:{
        color_var:"--btn-danger-border-color",
        title:'Buttons danger border',
        format:'color',
        default:"#dc3545",
        // priority: 17,
    },

    // warning btn
    btn_warning_bg_color:{
        color_var:"--btn-warning-bg-color",
        title:'Buttons warning background',
        format:'color',
        default:"#ffc107",
        // priority: 18,
    },
    btn_warning_color:{
        color_var:"--btn-warning-color",
        title:'Buttons warning text',
        format:'color',
        default:"#1f2d3d",
        // priority: 19,
    },
    btn_warning_border_color:{
        color_var:"--btn-warning-border-color",
        title:'Buttons warning border',
        format:'color',
        default:"#ffc107",
        // priority: 20,
    },

    a_color:{
        color_var:"--a-color",
        title:'Links',
        format:'color',
        default:"#007bff",
        // priority: 21,
    },
    a_color_hover:{
        color_var:"--a-color-hover",
        title:'Links hover',
        format:'color',
        default:"#0056b3",
        // priority: 21.1,
    },


    a_color_revers:{
        color_var:"--a-color-revers",
        title:'Links revers',
        format:'color',
        default:"#006AE0",
        // priority: 22,
    },
    a_color_hover_revers:{
        color_var:"--a-color-hover-revers",
        title:'Links hover revers',
        format:'color',
        default:"#00448F",
        // priority: 22.1,
    },

    text_color:{
        color_var:"--text-color",
        title:'Text color',
        format:'color',
        default:"#1b2026",
        // priority: 23,
    },
    ico_default_color:{
        color_var:"--ico-default-color",
        title:'ICO default color',
        format:'color',
        default:"#141a21",
        // priority: 24,
    },
    text_header_color:{
        color_var:"--text-header-color",
        title:'Text header color',
        format:'color',
        default:"#1f2d3d",
        // priority: 25,
    },
    background_default_color:{
        color_var:"--background-default-color",
        title:'Background default color',
        format:'color',
        default:"#ffffff",
        // priority: 26,
    },

    card_header_bg_color:{
        color_var:"--card-header-bg-color",
        title:'Card header background',
        format:'color',
        default:"#17a2b8",
        // priority: 27,
    },
    card_body_bg_color:{
        color_var:"--card-body-bg-color",
        title:'Card body background',
        format:'color',
        default:"#ffffff",
        // priority: 28,
    },
    card_footer_bg_color:{
        color_var:"--card-footer-bg-color",
        title:'Card footer background',
        format:'color',
        default:"#f7f7f7",
        // priority: 29,
    },
    card_color:{
        color_var:"--card-color",
        title:'Card color',
        format:'color',
        default:"#ffffff",
        // priority: 30,
    },

    control_label_color:{
        color_var:"--control-label-color",
        title:'Labels',
        format:'color',
        default:"#212529",
        // priority: 31,
    },
    help_block_color:{
        color_var:"--help-block-color",
        title:'Help content',
        format:'color',
        default:"#a3a3a3",
        // priority: 32,
    },
    help_text_color:{
        color_var:"---help-text-color",
        title:'Help text color',
        format:'color',
        default:"#a3a3a3",
        // priority: 33,
    },

    highlight_tr_hover_color:{
        color_var:"--highlight-tr-hover-color",
        title:'Table line hover bg color',
        format:'color',
        default:"#D8EDF8",
        // priority: 34,
    },
    table_border_color:{
        color_var:"--table-border-color",
        title:'Table border color',
        format:'color',
        default:"#dfe3e7",
        // priority: 35,
    },
    selected_color:{
        color_var:"--selected-color",
        title:'Table line selected bg color',
        format:'color',
        default:"#dfeed9",
        // priority: 36,
    },
    background_active_color:{
        color_var:"--background-active-color",
        title:'Background active color',
        format:'color',
        default:"#2d75be",
        // priority: 37,

    },
    background_passiv_color:{
        color_var:"--background-passiv-color",
        title:'Background active color',
        format:'color',
        default:"#3d434a",
        // priority: 37,
    },
    text_hover_color:{
        color_var:"--text-hover-color",
        title:'Text hover color',
        format:'color',
        default:"#16181b",
        // priority: 38,
    },
    boolean_true_color:{
        color_var:"--boolean-true-color",
        title:'Boolean true color',
        format:'color',
        default:"#128200",
        // priority: 39,
    },
    boolean_false_color:{
        color_var:"--boolean-false-color",
        title:'Boolean false color',
        format:'color',
        default:"#949494",
        // priority: 40,
    },
    modal_bg_color: {
        color_var:"--modal-bg-color",
        title:'Modal background color',
        format:'color',
        default:"#ffffff",
        // priority: 40.1,
    },
    api_sections_bg_color:{
        color_var:"--api-sections-bg-color",
        title:'Api sections background color',
        format:'color',
        default:"#f7f7f9",
        // priority: 40.2,
    },
    api_sections_border_color:{
        color_var:"--api-sections-border-color",
        title:'Api sections border color',
        format:'color',
        default:"#e1e1e8",
        // priority: 40.3,
    },

    //prettify.css colors of code highlighting in api
    prettify_com_color: {
        color_var:"--prettify-com-color",
        title:'Code highlighting color 1',
        format:'color',
        default:"#93a1a1",
        // priority: 40.4,
    },
    prettify_lit_color: {
        color_var:"--prettify-lit-color",
        title:'Code highlighting color 2',
        format:'color',
        default:"#195f91",
        // priority: 40.4,
    },
    prettify_fun_color: {
        color_var:"--prettify-fun-color",
        title:'Code highlighting color 3',
        format:'color',
        default:"#dc322f",
        // priority: 40.4,
    },
    prettify_str_color: {
        color_var:"--prettify-str-color",
        title:'Code highlighting color 4',
        format:'color',
        default:"#de1043",
        // priority: 40.4,
    },
    prettify_kwd_color: {
        color_var:"--prettify-kwd-color",
        title:'Code highlighting color 5',
        format:'color',
        default:"#1e347b",
        // priority: 40.4,
    },
    prettify_var_color: {
        color_var:"--prettify-var-color",
        title:'Code highlighting color 6',
        format:'color',
        default:"#008080",
        // priority: 40.4,
    },
    prettify_pln_color: {
        color_var:"--prettify-pln-color",
        title:'Code highlighting color 7',
        format:'color',
        default:"#48484c",
        // priority: 40.4,
    },
};

/**
 * Mixin with default colors for dark skin.
 */
var skinDarkMixin = {
    menu_active_bg_color: {
        default: "#0ca4ba",
    },

    content_wrapper: {
        default: "#515151",
    },

    main_header_bg_color: {
        default: "#828282",
    },
    main_border_color: {
        default: "#1f2d3d",
    },
    left_sidebar_bg_color: {
        default: "#828282",
    },
    left_sidebar_border_color: {
        default: "#1f2d3d",
    },
    customizer_options_bg_color: {
        default: "#828282",
    },
    breadcrumb_bg_color: {
        default:"#8E8E90",
    },
    btn_default_bg_color: {
        default: "#7e7e7e",
    },
    btn_default_color: {
        default: "#e3e3e3",
    },
    btn_default_border_color: {
        default: "#5f5f5f",
    },
    a_color: {
        default: "#ffffff",
    },
    a_color_hover: {
        default: "#d5d5d5",
    },
    card_header_bg_color: {
        default: "#73979d",
    },
    card_body_bg_color: {
        default: "#6c6c6c",
    },
    control_label_color: {
        default: "#d9d9d9",
    },
    help_block_color: {
        default: "#a3a3a3",
    },
    text_color: {
        default: "#cccccc",
    },
    table_border_color: {
        default: "#8d8d8d",
    },


    highlight_tr_hover_color: {
        default: "#474747",
    },
    selected_color: {
        default: "#0a2a00",
    },
    background_active_color: {
        default: "#6c6c6c",
    },
    background_passiv_color: {
        default: "#909090",
    },
    text_header_color: {
        default: "#c2c7d0",
    },

    background_default_color: {
        default: "#838383",
    },
    ico_default_color: {
        default: "#bebebe",
    },
    card_footer_bg_color: {
        default: "#6c6c6c",
    },

    boolean_false_color: {
        default: "#949494",
    },
    boolean_true_color: {
        default: "#21d703",
    },
    modal_bg_color: {
        default: "#515151",
    },
    api_sections_bg_color: {
        default: "#6c6c6c",
    },
    api_sections_border_color: {
        default:"#8d8d8d",
    },

    prettify_com_color: {
        default: "#93a1a1",
    },
    prettify_lit_color: {
        default: "#0DDBDE",
    },
    prettify_fun_color: {
        default:"#FAED5C",
    },
    prettify_str_color: {
        default: "#E8EC09",
    },
    prettify_kwd_color: {
        default: "#3DC2F5",
    },
    prettify_var_color: {
        default: "#12F39C",
    },
    prettify_pln_color: {
        default: "#C2C2C7",
    },
};

/**
 * Dark skin.
 */
guiSkins.dark = $.extend(true, {}, guiSkins.default, skinDarkMixin);

/**
 * Class, that is responsible for changing GUI skins and for changing skins' settings.
 */
class GuiCustomizer {
    /**
     * Constructor of GuiCustomizer class.
     * @param {object} skin Object, that contains selected skin and it's current settings.
     * @param {object} skins Object with skins - objects,
     * that contain options for guiCustomizer form properties.
     * @param {object} custom_setting Object with user's custom settings for skins -
     * those settings could extend default skins values.
     */
    constructor(skin={}, skins={}, custom_setting={}) {
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
            custom_style:{
                title:'Custom CSS',
                format:'textarea',
                // priority: 901,
            },

            delete_settings:{
                title:'Reset skin settings to default',
                text:'Reset settings',
                format:'button',
                // priority: 902,
                onclick:() => {
                    this.resetSkinSettingsAndUpdateCss();
                    guiPopUp.success("Skin's settings were successfully reset to default.");
                },
            },
            saveSkin:{
                title:'Save skin',
                text:'Save skin',
                format:'button',
                // priority: 903,
                onclick:() => {
                    this.saveSkinSettings();
                    guiPopUp.success("Skin's settings were successfully saved.")
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
        tabSignal.emit('GuiCustomizer.beforeInit', this);

        // Creates skinField.
        this.skinField = new guiFields.choices({
            name: 'skin_name',
            title:'Skin',
            format:'choices',
            enum: Object.keys(this.skins),
        });

        // forms guiCustomizer form options.
        this.form = $.extend(
            true, {}, this.skins[this.skin.name], this.form_base,
        );

        // Creates formField.
        this.formField = new guiFields.form({
            name: 'skin_settings',
            title:"Skin settings",
            form: this.form
        });

        tabSignal.emit('GuiCustomizer.afterInit', this);
    }

    /**
     * Method, that forms string, which contains values of CSS variables,
     * based of skin.name and skin.settings.
     * @return {string}
     */
    formCss() {
        let css = "";

        let color_vars = [];

        for(let key in this.form) {
            if(!this.form[key].color_var) {
                continue;
            }

            if(!this.skin.settings[key]) {
                continue;
            }

            color_vars.push(this.form[key].color_var+":"+this.skin.settings[key]);
        }

        css += ".gui-skin-"+this.skin.name+"{"+color_vars.join(';\n')+"}";

        if(this.skin.settings.custom_style) {
            css = css + "\n" + this.skin.settings.custom_style;
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
        $("#currentSkin").remove();
        $("body").append("<style id='currentSkin' >"+css+"</style>");
    }

    /**
     * Method, that returns custom settings of current skin.
     */
    loadSkinCustomSettings() {
        let skin = this.skin.name;
        // let settings = guiLocalSettings.get('skins_settings');
        let settings = this.skins_custom_settings;

        if(settings && settings[skin]) {
            return settings[skin];
        }

        return {};
    }

    /**
     * Method, that adds current skin's custom_settings to original settings.
     */
    applySkinCustomSettings() {
        let settings = this.loadSkinCustomSettings();

        for(let key in settings) {
            if(!this.form[key]) {
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
        for(let key in this.form) {
            let val;

            if(this.form[key]) {
                val = this.form[key].default;
            }

            this.skin.settings[key] = val;
            this.formField.options.form[key].default = val;
        }

        this.skin.settings = { ...this.skin.settings };
    }

    /**
     * Method, that updates CSS variables, based on current skin settings
     * and changes <body></body> skin class.
     * Method, activates current skin settings.
     */
    updateCssVariables() {
        this.replaceCss(this.formCss());

        let str = $("body").attr("class").replace(/gui-skin-[^ ]+/g, "") +
            " gui-skin-" + this.skin.name + " ";

        $("body").attr("class",  str);
    }

    /**
     * Method, that resets custom skin settings to default.
     */
    resetSkinSettings() {
        let settings = guiLocalSettings.get('skins_settings') || {};

        delete settings[this.skin.name];

        this.skins_custom_settings = settings;

        guiLocalSettings.set('skins_settings', settings);

        tabSignal.emit('GuiCustomizer.skins_custom_settings.reseted', this);
    }

    /**
     * Method, that saves custom skin settings.
     */
    saveSkinSettings() {
        let settings = this.skins_custom_settings;

        settings[this.skin.name] = $.extend(true, {}, this.skin.settings);

        this.skins_custom_settings = { ...settings};

        guiLocalSettings.set('skins_settings', settings);

        tabSignal.emit('GuiCustomizer.skins_custom_settings.saved', this);
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

        tabSignal.emit('GuiCustomizer.skin.name.changed', this);
    }

    /**
     * Method, that changes current skin settings.
     * @param {object} settings Object with new settings.
     */
    setSkinSettings(settings) {
        this.skin.settings = settings;
        this.skin.settings = { ...this.skin.settings };

        this.updateCssVariables();

        tabSignal.emit('GuiCustomizer.skin.settings.changed', this);
    }
}

/**
 * Instance of GuiCustomizer class.
 */
var guiCustomizer = new GuiCustomizer(
    {
        name: guiLocalSettings.get('skin') || 'default',
        settings: {},
    },
    guiSkins,
    guiLocalSettings.get('skins_settings') || {},
);