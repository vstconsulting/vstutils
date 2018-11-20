

var guiSkins = {
}

guiSkins.base = function(){

    this.name = 'base'
    this.activate = function(){

    }

    this.deactivate = function(){

    }

    this.renderOptions = function(){
        return ""
    }
}

guiSkins.light = function(){
    this.name = 'Light'
    guiSkins.base.apply(this, arguments)
}

guiSkins.dark = function(){
    this.name = 'Dark'
    guiSkins.base.apply(this, arguments)
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
    if(this.skin)
    {
        this.skin.deactivate()
        this.skin = undefined
    }

    if(this.skinId == skinId)
    {
        return;
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
        skins.push({id:i, name:guiSkins[i].name})
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
                    thisObj.renderSkinOptions()
                },
            },
        },
    }

    this.customizerForm = new guiElements.form(undefined, formData);
    $('.guiCustomizer').insertTpl(spajs.just.render("customize_form", {form:this.customizerForm, customizer:this}))
}

tabSignal.connect("loading.completed", function()
{
    guiCustomizer.setSkin(guiLocalSettings.get('skin'))
})

