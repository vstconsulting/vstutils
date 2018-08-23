
var guiElements = {
}

/**
 *
 * @param {type} opt
 * @returns {guiElements.button}
 *
 * opt = {
 * class:''     - css
 * link:''      - ссылка
 * title:''     - подсказка
 * onclick:''   - текст события onclick
 * text:''      - текст надписи
 * }
 */
guiElements.link_button = function(opt)
{
    this.render = function(render_options = {})
    {
        if(!opt)
        {
            opt = {}
        }

        if(!opt.onclick)
        {
            opt.onclick = "return spajs.openURL(this.href);"
        }

        let options = $.extend({}, opt, render_options)
        return spajs.just.render("guiElements.link_button", {opt:options, guiElement:this});
    }
}


guiElements.string = function(opt, value)
{
    this.element_id = ("filed_"+ Math.random()+ "" +Math.random()+ "" +Math.random()).replace(/\./g, "")
    this.render = function(render_options = {})
    {
        if(!opt)
        {
            opt = {}
        }

        let options = $.extend({}, opt, render_options)
         
        if(options.hideReadOnly && opt.readOnly)
        { 
            return "";
        }      
        
        return spajs.just.render("guiElements.string", {opt:options, guiElement:this, value:value});
    }

    this.getValue = function()
    {
        return $("#"+this.element_id).val()
    }
}

guiElements.button = function(opt)
{
    this.element_id = ("filed_"+ Math.random()+ "" +Math.random()+ "" +Math.random()).replace(/\./g, "")
    this.render = function(render_options = {})
    {
        if(!opt)
        {
            opt = {}
        }

        let options = $.extend({}, opt, render_options)
        var thisObj = this;

        return spajs.just.render("guiElements.button", {opt:options, guiElement:this}, function(){
            $('#'+thisObj.element_id).on('click', false, opt.onclick)
        });
    }
}

guiElements.enum = function(opt, value)
{
    this.element_id = ("filed_"+ Math.random()+ "" +Math.random()+ "" +Math.random()).replace(/\./g, "")
    this.render = function(render_options = {})
    {
        if(!opt)
        {
            opt = {}
        }
        
        let options = $.extend({}, opt, render_options)
        
        return spajs.just.render("guiElements.enum", {opt:options, guiElement:this, value:value});
    }
    
    this.getValue = function()
    {
        return $("#"+this.element_id).val()
    }
}

guiElements.file = function(opt)
{
    this.element_id = ("filed_"+ Math.random()+ "" +Math.random()+ "" +Math.random()).replace(/\./g, "")

    this.loadFile = function(event)
    {
        debugger;
        console.log("loadFile", event.target.files)
        for (var i = 0; i < event.target.files.length; i++)
        {
            if (event.target.files[i].size > 1024 * 1024 * 1)
            {
                $.notify("File too large", "error");
                console.log("File too large " + event.target.files[i].size)
                continue;
            }

            var reader = new FileReader();
            debugger;
            reader.onload = function (e)
            {
                debugger;
                $('#fileContent_' + element)[0].setAttribute("value", e.target.result);
                $(element).val(e.target.result)
            }

            reader.readAsText(event.target.files[i]);
            return;
        }
    }

    this.render = function(render_options = {})
    {
        if(!opt)
        {
            opt = {}
        }

        let options = $.extend({}, opt, render_options);

        //return spajs.just.render("guiElements.file", {opt:options, guiElement:this});
        return spajs.just.render("guiElements.file", {opt:options, guiElement:this},() => {
            debugger;
            $('#'+this.element_id).on('change', false, this.loadFile)
        });
    }
}

guiElements.boolean = function(opt, value)
{
    this.element_id = ("filed_"+ Math.random()+ "" +Math.random()+ "" +Math.random()).replace(/\./g, "")
    this.render = function(render_options = {})
    {
        //debugger;
        if(!opt)
        {
            opt = {}
        }

        let options = $.extend({}, opt, render_options)

        if(options.hideReadOnly && opt.readOnly)
        {
            return "";
        }

        return spajs.just.render("guiElements.boolean", {opt:options, guiElement:this, value:value});
    }

    this.getValue = function()
    {
        //return $("#"+this.element_id).val()
        return $("#"+this.element_id).hasClass('selected');
    }
}

guiElements.textarea = function(opt)
{
    this.element_id = ("filed_"+ Math.random()+ "" +Math.random()+ "" +Math.random()).replace(/\./g, "")
    this.render = function(render_options = {})
    {
        if(!opt)
        {
            opt = {}
        }

        let options = $.extend({}, opt, render_options)

        if(options.hideReadOnly && opt.readOnly)
        {
            return "";
        }

        return spajs.just.render("guiElements.textarea", {opt:options, guiElement:this});
    }

    this.getValue = function()
    {
        return $("#"+this.element_id).val()
    }
}

/**
 *
    TYPE_OBJECT = "object"  #:
    TYPE_STRING = "string"  #:
    TYPE_NUMBER = "number"  #:
    TYPE_INTEGER = "integer"  #:
    TYPE_BOOLEAN = "boolean"  #:
    TYPE_ARRAY = "array"  #:
    TYPE_FILE = "file"  #:

    # officially supported by Swagger 2.0 spec
    FORMAT_DATE = "date"  #:
    FORMAT_DATETIME = "date-time"  #:
    FORMAT_PASSWORD = "password"  #:
    FORMAT_BINARY = "binary"  #:
    FORMAT_BASE64 = "bytes"  #:
    FORMAT_FLOAT = "float"  #:
    FORMAT_DOUBLE = "double"  #:
    FORMAT_INT32 = "int32"  #:
    FORMAT_INT64 = "int64"  #:

    # defined in JSON-schema
    FORMAT_EMAIL = "email"  #:
    FORMAT_IPV4 = "ipv4"  #:
    FORMAT_IPV6 = "ipv6"  #:
    FORMAT_URI = "uri"  #:

    # pulled out of my ass
    FORMAT_UUID = "uuid"  #:
    FORMAT_SLUG = "slug"  #:
    FORMAT_DECIMAL = "decimal"
 *
 */