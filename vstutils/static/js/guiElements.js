
var guiElements = {
}

guiElements.base = function(opt, value)
{
    this.value = value
    this.element_id = ("filed_"+ Math.random()+ "" +Math.random()+ "" +Math.random()).replace(/\./g, "")
    this.onChange_calls = []

    this._onRender = function()
    {
        $('#'+this.element_id).on('change', false, () => {
            this._callAllonChangeCallback()
        })

        if(options.onclick)
        {
            $('#'+this.element_id).on('click', false, options.onclick)
        }
    }
    
    this.render = function(render_options = {})
    {
        let options = $.extend({}, opt, render_options)
        if(options.hideReadOnly && options.readOnly)
        {
            return "";
        }

        return spajs.just.render("guiElements."+this.name , {opt:options, guiElement:this, value:this.value}, () => {
            this._onRender(arguments)
        });
    }
     
    this.getValue = function()
    {
        return $("#"+this.element_id).val()
    }

    /**
     * Добавляет колбек на событие onChange чтоб зависимые поля могли вовремя перестроиться
     * @param {function} callback
     * @returns {undefined}
     *
     * @example На пример так поле notes становится зависимым от поля name у проектов
     *  window.api.openapi.definitions.OneProject.properties.notes.dependsOn = ['name']
     */
    this.onChange = function(callback)
    {
        this.onChange_calls.push(callback)
    }

    this._callAllonChangeCallback = function()
    {
        for(let i in this.onChange_calls)
        {
            this.onChange_calls[i]({
                filed:this,
                opt:opt,
                value:this.getValue()
            })
        }
    }
    /**
     * Вызывается для перестройки поля в тот момент когда поле от которого мы зависим поменяло значение
     * @param {function} callback
     * @returns {undefined}
     */
    this.updateOptions = function(arg)
    {
        console.log(arg)
    }

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
guiElements.link_button = function(opt = {})
{
    this.name = 'link_button'
    guiElements.base.apply(this, arguments)  
}
 
guiElements.string = function()
{
    this.name = 'string'
    guiElements.base.apply(this, arguments) 
}

guiElements.button = function()
{
    this.name = 'button'
    guiElements.base.apply(this, arguments) 
}

guiElements.enum = function(opt = {}, value)
{
    this.name = 'enum'
    guiElements.base.apply(this, arguments) 
}

guiElements.file = function(opt = {})
{
    this.name = 'file'
    guiElements.base.apply(this, arguments) 

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
}

guiElements.boolean = function(opt = {}, value)
{
    this.name = 'boolean'
    guiElements.base.apply(this, arguments) 
 
    this.getValue = function()
    {
        return $("#"+this.element_id).hasClass('selected');
    }
}

guiElements.textarea = function(opt = {})
{
    this.name = 'textarea'
    guiElements.base.apply(this, arguments)  
}


function set_api_options(options) 
{
    let additional_options = "";
    if (options.readOnly) {
        additional_options += "readonly disabled "
    }
    
    if (options.minLength) {
        additional_options += "minlength='" + options.minLength + "' "
    }
    
    if (options.maxLength) {
        additional_options += "maxlength='" + options.maxLength + "' "
    }
    
    if (/^Required/.test(options.description)) {
        additional_options += "required "
    }
    
    if (options.default) {
        additional_options += "placeholder='" + options.default + "' "
    }
    
    if (options.pattern) {
        additional_options += "pattern='" + options.pattern + "' "
    }
    
    return additional_options;
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