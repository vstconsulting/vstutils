

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
                    format:'button',
                    type: "string",
                    onclick:() => {
                        this.applySettings()
                    },
                },
                save:{
                    title:'Save',
                    text:'Save',
                    format:'button',
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

guiSkins.light = function(){
    guiSkins.base.apply(this, arguments)
    this.title = 'Light'
    this.name = 'light'

    this.init()
}

guiSkins.dark = function(){
    guiSkins.base.apply(this, arguments)
    this.title = 'Dark'
    this.name = 'dark'

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

