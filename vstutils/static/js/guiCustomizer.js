

var guiSkins = {
}

guiSkins.base = function(value){

    this.name = 'base'
    this.value = value

    this.deactivate = function(){
        $("#curentSkin").remove()
    }

    this.activate = function(){
        this.setValue(this.loadSettings())
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

        this.customizerForm = new guiElements.form(undefined, this.options);
    }

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

guiSkins.default = function(){
    guiSkins.base.apply(this, arguments)
    this.title = 'Default'
    this.name = 'default'

    this.init()
}

guiSkins.dark = function(){
    guiSkins.base.apply(this, arguments)
    this.title = 'Dark'
    this.name = 'dark'

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

        css += ".gui-skin-dark{"+color_vars.join(';\n')+"}"
        css = css + "\n" + this.value.custom_style
        //debugger;
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
                    value:this.value.menu_active_bg_color || "#0ca4ba61",
                    onchange:() => {
                        this.applySettings()
                    },
                },
                content_wrapper:{
                    color_var:"--content-wrapper",
                    title:'Body background',
                    format:'color',
                    type: "string",
                    value:this.value.content_wrapper || "#515151",
                    onchange:() => {
                        this.applySettings()
                    },
                },
                main_header_bg_color:{
                    color_var:"--main-header-bg-color",
                    title:'Top navigation background',
                    format:'color',
                    type: "string",
                    value:this.value.main_header_bg_color || "#828282",
                    onchange:() => {
                        this.applySettings()
                    },
                },
                main_border_color:{
                    color_var:"--main-border-color",
                    title:'Top navigation border',
                    format:'color',
                    type: "string",
                    value:this.value.main_border_color || "#1f2d3d",
                    onchange:() => {
                        this.applySettings()
                    },
                },
                btn_default_bg_color:{
                    color_var:"--btn-default-bg-color",
                    title:'Buttons background',
                    format:'color',
                    type: "string",
                    value:this.value.btn_default_bg_color || "#7e7e7e",
                    onchange:() => {
                        this.applySettings()
                    },
                },
                btn_default_color:{
                    color_var:"--btn-default-color",
                    title:'Buttons text',
                    format:'color',
                    type: "string",
                    value:this.value.btn_default_color || "#e3e3e3",
                    onchange:() => {
                        this.applySettings()
                    },
                },
                btn_default_border_color:{
                    color_var:"--btn-default-border-color",
                    title:'Buttons border',
                    format:'color',
                    type: "string",
                    value:this.value.btn_default_border_color || "#5f5f5f",
                    onchange:() => {
                        this.applySettings()
                    },
                },
                action_bg_color:{
                    color_var:"--action-bg-color",
                    title:'Action buttons background',
                    format:'color',
                    type: "string",
                    value:this.value.action_bg_color || "#ffeebc",
                    onchange:() => {
                        this.applySettings()
                    },
                },
                action_color:{
                    color_var:"--action-color",
                    title:'Action buttons color',
                    format:'color',
                    type: "string",
                    value:this.value.action_color || "#474f57",
                    onchange:() => {
                        this.applySettings()
                    },
                },
                a_color:{
                    color_var:"--a-color",
                    title:'Links',
                    format:'color',
                    type: "string",
                    value:this.value.a_color || "#97b8cc",
                    onchange:() => {
                        this.applySettings()
                    },
                },
                card_header_bg_color:{
                    color_var:"--card-header-bg-color",
                    title:'Card header background',
                    format:'color',
                    type: "string",
                    value:this.value.card_header_bg_color || "#17a2b8",
                    onchange:() => {
                        this.applySettings()
                    },
                },
                card_body_bg_color:{
                    color_var:"--card-body-bg-color",
                    title:'Card body background',
                    format:'color',
                    type: "string",
                    value:this.value.card_body_bg_color || "#6c6c6c",
                    onchange:() => {
                        this.applySettings()
                    },
                },
                control_label_color:{
                    color_var:"--control-label-color",
                    title:'Labels',
                    format:'color',
                    type: "string",
                    value:"#d9d9d9",
                    onchange:() => {
                        this.applySettings()
                    },
                },
                help_block_color:{
                    color_var:"--help-block-color",
                    title:'Help content',
                    format:'color',
                    type: "string",
                    value:"#a3a3a3",
                    onchange:() => {
                        this.applySettings()
                    },
                },
                custom_style:{
                    title:'Custom CSS',
                    format:'textarea',
                    type: "string",
                    value:this.value.custom_style,
                    onchange:() => {
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
        if(i == 'base')
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
})

