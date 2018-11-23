

var guiSkins = {
}

guiSkins.base = function(value){

    this.name = 'base'
    this.value = value

    this.deactivate = function(){
        $("#curentSkin").remove()
    }

    this.activate = function(){
        //this.setValue(this.loadSettings())
        this.replaceCss(this.getCss())
    }

    this.applySettings = function(){
        this.setValue(this.customizerForm.getValue())
        this.replaceCss(this.getCss())
    }

    this.getCss = function(){
        return this.value.custom_style
    }

    this.saveSettings = function(){
        guiLocalSettings.set(this.name+"_settings", this.value)
        guiPopUp.success("Skin was saved.");
    }

    this.loadSettings = function(){
        let val = guiLocalSettings.get(this.name+"_settings")
        if(!val)
        {
            return {}
        }

        return val
    }

    this.setValue = function(value)
    {
        this.value = value
    }

    this.init = function()
    {
        this.setValue(this.loadSettings())
        this.initFormOptions()
        this.afterInitFormOptions()

        tabSignal.emit('guiSkin.' + this.name + '.init', {guiSkin: this});

        this.customizerForm = new guiElements.form(undefined, this.options);
    }

    this.afterInitFormOptions = function(){}
    this.initFormOptions = function()
    {
        this.options = {
            form:{
                custom_style:{
                    title:'Custom CSS',
                    format:'textarea',
                    type: "string",
                    value:this.value.custom_style,
                    onchange:function(event){
                    },
                },
                apply:{
                    title:'Apply',
                    text:'Apply',
                    format:'formButton',
                    type: "string",
                    onclick:() => {
                        this.applySettings()
                    },
                },
                save:{
                    title:'Save',
                    text:'Save',
                    format:'formButton',
                    type: "string",
                    onclick:() => {
                        this.applySettings()
                        this.saveSettings()
                    },
                },
            },
        }

        return this.options
    }

    this.renderOptions = function()
    {
        return this.customizerForm.render();
    }

    this.replaceCss = function(css){
        $("#curentSkin").remove()
        $("body").append("<style id='curentSkin' >"+css+"</style>")
    }
}
guiSkins.base.hidden = true

guiSkins.default = function(){
    guiSkins.base.apply(this, arguments)
    this.title = 'Default'
    this.name = 'default'

    this.getCss = function(){
        let css = ""

        let color_vars = []

        for(let i in this.options.form)
        {
            if(!this.options.form[i].color_var)
            {
                continue;
            }

            if(!this.value[i])
            {
                continue;
            }

            color_vars.push(this.options.form[i].color_var+":"+this.value[i])
        }

        css += ".gui-skin-"+this.name+"{"+color_vars.join(';\n')+"}"
        css = css + "\n" + this.value.custom_style

        return css
    }

    this.initFormOptions = function()
    {
        this.options = {
            form:{
                menu_active_bg_color:{
                    color_var:"--menu-active-bg-color",
                    title:'Active menu background',
                    format:'color',
                    type: "string",
                    default:"#0078ff",
                    priority: 0,
                    value:this.value.menu_active_bg_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                menu_active_color:{
                    color_var:"--menu-active-color",
                    title:'Active menu color',
                    format:'color',
                    type: "string",
                    default:"#ffffff",
                    priority: 1,
                    value:this.value.menu_active_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                content_wrapper:{
                    color_var:"--content-wrapper",
                    title:'Body background',
                    format:'color',
                    type: "string",
                    default:"#ecf0f5",
                    priority: 2,
                    value:this.value.content_wrapper,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                main_header_bg_color:{
                    color_var:"--main-header-bg-color",
                    title:'Top navigation background',
                    format:'color',
                    type: "string",
                    default:"#ffffff",
                    priority: 3,
                    value:this.value.main_header_bg_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                main_border_color:{
                    color_var:"--main-border-color",
                    title:'Top navigation border',
                    format:'color',
                    type: "string",
                    default:"#dee2e6",
                    priority: 4,
                    value:this.value.main_border_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },

                left_sidebar_bg_color:{
                    color_var:"--left-sidebar-bg-color",
                    title:'Left sidebar background',
                    format:'color',
                    type: "string",
                    default:"#343a40",
                    priority: 5,
                    value:this.value.left_sidebar_bg_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                left_sidebar_border_color:{
                    color_var:"--left-sidebar-border-color",
                    title:'Left sidebar border',
                    format:'color',
                    type: "string",
                    default:"#4b545c",
                    priority: 6,
                    value:this.value.left_sidebar_border_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                customizer_options_bg_color:{
                    color_var:"--customizer-options-bg-color",
                    title:'Customizer sidebar background',
                    format:'color',
                    type: "string",
                    default:"#343a40",
                    priority: 7,
                    value:this.value.customizer_options_bg_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                breadcrumb_bg_color:{
                    color_var:"--breadcrumb-bg-color",
                    title:'Customizer sidebar background',
                    format:'color',
                    type: "string",
                    default:"#d2d6de",
                    priority: 8,
                    value:this.value.breadcrumb_bg_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },


                // default btn
                btn_default_bg_color:{
                    color_var:"--btn-default-bg-color",
                    title:'Buttons default background',
                    format:'color',
                    type: "string",
                    default:"#f4f4f4",
                    priority: 9,
                    value:this.value.btn_default_bg_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                btn_default_color:{
                    color_var:"--btn-default-color",
                    title:'Buttons default text',
                    format:'color',
                    type: "string",
                    default:"#444444",
                    priority: 10,
                    value:this.value.btn_default_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                btn_default_border_color:{
                    color_var:"--btn-default-border-color",
                    title:'Buttons default border',
                    format:'color',
                    type: "string",
                    default:"#dddddd",
                    priority: 11,
                    value:this.value.btn_default_border_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },

                // primary btn
                btn_primary_bg_color:{
                    color_var:"--btn-primary-bg-color",
                    title:'Buttons primary background',
                    format:'color',
                    type: "string",
                    default:"#007bff",
                    priority: 12,
                    value:this.value.btn_primary_bg_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                btn_primary_color:{
                    color_var:"--btn-primary-color",
                    title:'Buttons primary text',
                    format:'color',
                    type: "string",
                    default:"#ffffff",
                    priority: 13,
                    value:this.value.btn_primary_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                btn_primary_border_color:{
                    color_var:"--btn-primary-border-color",
                    title:'Buttons primary border',
                    format:'color',
                    type: "string",
                    default:"#007bff",
                    priority: 14,
                    value:this.value.btn_primary_border_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },

                // danger btn
                btn_danger_bg_color:{
                    color_var:"--btn-danger-bg-color",
                    title:'Buttons danger background',
                    format:'color',
                    type: "string",
                    default:"#dc3545",
                    priority: 15,
                    value:this.value.btn_danger_bg_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                btn_danger_color:{
                    color_var:"--btn-danger-color",
                    title:'Buttons danger text',
                    format:'color',
                    type: "string",
                    default:"#ffffff",
                    priority: 16,
                    value:this.value.btn_danger_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                btn_danger_border_color:{
                    color_var:"--btn-danger-border-color",
                    title:'Buttons danger border',
                    format:'color',
                    type: "string",
                    default:"#dc3545",
                    priority: 17,
                    value:this.value.btn_danger_border_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },

                // warning btn
                btn_warning_bg_color:{
                    color_var:"--btn-warning-bg-color",
                    title:'Buttons warning background',
                    format:'color',
                    type: "string",
                    default:"#ffc107",
                    priority: 18,
                    value:this.value.btn_warning_bg_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                btn_warning_color:{
                    color_var:"--btn-warning-color",
                    title:'Buttons warning text',
                    format:'color',
                    type: "string",
                    default:"#1f2d3d",
                    priority: 19,
                    value:this.value.btn_warning_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                btn_warning_border_color:{
                    color_var:"--btn-warning-border-color",
                    title:'Buttons warning border',
                    format:'color',
                    type: "string",
                    default:"#ffc107",
                    priority: 20,
                    value:this.value.btn_warning_border_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },


                a_color:{
                    color_var:"--a-color",
                    title:'Links',
                    format:'color',
                    type: "string",
                    default:"#007bff",
                    priority: 21,
                    value:this.value.a_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                a_color_hover:{
                    color_var:"--a-color-hover",
                    title:'Links hover',
                    format:'color',
                    type: "string",
                    default:"#0056b3",
                    priority: 22,
                    value:this.value.a_color_hover,
                    onchange:() => {
                        this.applySettings()
                    },
                },

                text_color:{
                    color_var:"--text-color",
                    title:'Text color',
                    format:'color',
                    type: "string",
                    default:"#1b2026",
                    priority: 23,
                    value:this.value.text_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                ico_default_color:{
                    color_var:"--ico-default-color",
                    title:'ICO default color',
                    format:'color',
                    type: "string",
                    default:"#141a21",
                    priority: 24,
                    value:this.value.ico_default_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                text_header_color:{
                    color_var:"--text-header-color",
                    title:'Text header color',
                    format:'color',
                    type: "string",
                    default:"#1f2d3d",
                    priority: 25,
                    value:this.value.text_header_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                background_default_color:{
                    color_var:"--background-default-color",
                    title:'Background default color',
                    format:'color',
                    type: "string",
                    default:"#ffffff",
                    priority: 26,
                    value:this.value.background_default_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },



                card_header_bg_color:{
                    color_var:"--card-header-bg-color",
                    title:'Card header background',
                    format:'color',
                    type: "string",
                    default:"#17a2b8",
                    priority: 27,
                    value:this.value.card_header_bg_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                card_body_bg_color:{
                    color_var:"--card-body-bg-color",
                    title:'Card body background',
                    format:'color',
                    type: "string",
                    default:"#ffffff",
                    priority: 28,
                    value:this.value.card_body_bg_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                card_footer_bg_color:{
                    color_var:"--card-footer-bg-color",
                    title:'Card footer background',
                    format:'color',
                    type: "string",
                    default:"#f7f7f7",
                    priority: 29,
                    value:this.value.card_footer_bg_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                card_color:{
                    color_var:"--card-color",
                    title:'Card color',
                    format:'color',
                    type: "string",
                    default:"#ffffff",
                    priority: 30,
                    value:this.value.card_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },

                control_label_color:{
                    color_var:"--control-label-color",
                    title:'Labels',
                    format:'color',
                    type: "string",
                    default:"#212529",
                    priority: 31,
                    value:this.value.control_label_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                help_block_color:{
                    color_var:"--help-block-color",
                    title:'Help content',
                    format:'color',
                    type: "string",
                    default:"#a3a3a3",
                    priority: 32,
                    value:this.value.help_block_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                help_text_color:{
                    color_var:"---help-text-color",
                    title:'Help text color',
                    format:'color',
                    type: "string",
                    default:"#a3a3a3",
                    priority: 33,
                    value:this.value.help_text_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },



                highlight_tr_hover_color:{
                    color_var:"--highlight-tr-hover-color",
                    title:'Table line hover bg color',
                    format:'color',
                    type: "string",
                    default:"#D8EDF8",
                    priority: 34,
                    value:this.value.highlight_tr_hover_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                table_border_color:{
                    color_var:"--table-border-color",
                    title:'Table border color',
                    format:'color',
                    type: "string",
                    default:"#dfe3e7",
                    priority: 35,
                    value:this.value.table_border_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                selected_color:{
                    color_var:"--selected-color",
                    title:'Table line selected bg color',
                    format:'color',
                    type: "string",
                    default:"#dfeed9",
                    priority: 36,
                    value:this.value.selected_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                background_active_color:{
                    color_var:"--background-active-color",
                    title:'Background active color',
                    format:'color',
                    type: "string",
                    default:"#f8f9fa",
                    priority: 37,
                    value:this.value.background_active_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                text_hover_color:{
                    color_var:"--text-hover-color",
                    title:'Text hover color',
                    format:'color',
                    type: "string",
                    default:"#16181b",
                    priority: 38,
                    value:this.value.text_hover_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                boolean_true_color:{
                    color_var:"--boolean-true-color",
                    title:'Boolean true color',
                    format:'color',
                    type: "string",
                    default:"#128200",
                    priority: 39,
                    value:this.value.boolean_true_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },
                boolean_false_color:{
                    color_var:"--boolean-false-color",
                    title:'Boolean false color',
                    format:'color',
                    type: "string",
                    default:"#949494",
                    priority: 40,
                    value:this.value.boolean_false_color,
                    onchange:() => {
                        this.applySettings()
                    },
                },



                custom_style:{
                    title:'Custom CSS',
                    format:'textarea',
                    type: "string",
                    priority: 900,
                    value:this.value.custom_style,
                    onchange:() => {
                    },
                },
                apply:{
                    title:'Apply',
                    text:'Apply',
                    format:'formButton',
                    type: "string",
                    priority: 902,
                    onclick:() => {
                        this.applySettings()
                    },
                },
                save:{
                    title:'Save',
                    text:'Save',
                    format:'formButton',
                    type: "string",
                    priority: 901,
                    onclick:() => {
                        this.applySettings()
                        this.saveSettings()
                    },
                },
            },
        }

        return this.options
    }

    this.init()
}

guiSkins.dark = function(){
    guiSkins.default.apply(this, arguments)
    this.title = 'Dark'
    this.name = 'dark'

    this.afterInitFormOptions = function()
    {
        let form = this.options.form
        form.menu_active_bg_color.default       = "#0ca4ba"
        form.content_wrapper.default            = "#515151"
        form.main_header_bg_color.default       = "#828282"
        form.main_border_color.default          = "#1f2d3d"
        form.left_sidebar_bg_color.default      = "#828282"
        form.left_sidebar_border_color.default  = "#1f2d3d"
        form.customizer_options_bg_color.default= "#828282"
        form.breadcrumb_bg_color.default        = "#8E8E90"
        form.btn_default_bg_color.default       = "#7e7e7e"
        form.btn_default_color.default          = "#e3e3e3"
        form.btn_default_border_color.default   = "#5f5f5f"
        form.a_color.default                    = "#ffffff"
        form.a_color_hover.default              = "#d5d5d5"
        form.card_header_bg_color.default       = "#73979d"
        form.card_body_bg_color.default         = "#6c6c6c"
        form.control_label_color.default        = "#d9d9d9"
        form.help_block_color.default           = "#a3a3a3"
        form.text_color.default                 = "#cccccc"
        form.table_border_color.default         = "#8d8d8d"


        form.highlight_tr_hover_color.default   = "#474747"
        form.selected_color.default             = "#0a2a00"
        form.background_active_color.default    = "#6c6c6c"
        form.text_header_color.default          = "#c2c7d0"

        form.background_default_color.default   = "#838383"
        form.ico_default_color.default          = "#bebebe"
        form.card_footer_bg_color.default       = "#6c6c6c"

        form.boolean_false_color.default        = "#949494"
        form.boolean_true_color.default         = "#21d703"

    }

    this.init()
}


/**
 * @type Object
 */
guiCustomizer = {
    skin:undefined
}

guiCustomizer.renderSkinOptions = function(skinId)
{
    if(!this.skin)
    {
        return ""
    }

    return this.skin.renderOptions()
}

guiCustomizer.setSkin = function(skinId)
{
    if(this.skinId == skinId)
    {
        return;
    }

    if(this.skin)
    {
        this.skin.deactivate()
        this.skin = undefined
    }

    if(guiSkins[skinId] == undefined)
    {
        return;
    }

    this.skinId = skinId
    this.skin = new guiSkins[skinId]()
    $("body").attr("class", $("body").attr("class").replace(/gui-skin-[^ ]+/g, "")+" gui-skin-"+skinId+" ")

    guiLocalSettings.set('skin', skinId)
    this.skin.activate()
}

guiCustomizer.render = function()
{
    let skins = []
    for(let i in guiSkins)
    {
        if(guiSkins[i].hidden)
        {
            continue;
        }

        skins.push({id:i, name:guiSkins[i].title || guiSkins[i].name})
    }

    let thisObj = this;
    let formData = {
        title:"Customize",
        form:{
            skin:{
                title:'Skin',
                description: "",
                format:'enum',
                type: "string",
                enum:skins,
                value:this.skinId,
                onchange:function(event){
                    thisObj.setSkin(event.value)
                    $('.customize-skin-options').insertTpl(thisObj.renderSkinOptions())
                },
            },
        },
    }

    this.customizerForm = new guiElements.form(undefined, formData);
    $('.guiCustomizer').insertTpl(spajs.just.render("customize_form", {form:this.customizerForm, customizer:this}))
}

tabSignal.connect("webGui.start", function()
{
    guiCustomizer.setSkin(guiLocalSettings.get('skin'))
    guiCustomizer.render();
})

