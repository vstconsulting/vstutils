
var guiElements = {
}

guiElements.base = function(opt = {}, value, parent_object)
{
    this.opt = opt
    this.value = value
    this.element_id = ("filed_"+ Math.random()+ "" +Math.random()+ "" +Math.random()).replace(/\./g, "")
    this.onChange_calls = []

    this.setValue = function(value)
    {
        this.value = value
    }

    this.reductionToType = function(value)
    {

        if(this.render_options.type == "string" || this.render_options.type == "file")
        {
            if(!value)
            {
                return ""
            }

            return value.toString()
        }

        if(this.render_options.type == "number" || this.render_options.type == "integer" )
        {
            return value/1
        }

        if(this.render_options.type == "boolean" )
        {
            return value == true
        }

        return value
    }

    this._onRender = function(options)
    {
        $('#'+this.element_id).on('change', false, () => {
            this._callAllonChangeCallback()
        })

        if(options.onclick)
        {
            $('#'+this.element_id).on('click', false, options.onclick)
        }
    }

    this.render = function(render_options)
    {
        if(render_options !== undefined)
        {
            this.render_options = $.extend({}, opt, render_options)
        }
        else if(this.render_options === undefined)
        {
            this.render_options = $.extend({}, opt)
        }

        if(this.render_options.hideReadOnly && this.render_options.readOnly)
        {
            return "";
        }

        return spajs.just.render("guiElements."+this.name , {opt:this.render_options, guiElement:this, value:this.value}, () => {
            this._onRender(this.render_options)
            this._callAllonChangeCallback()
        });
    }

    this.getValue = function()
    {
        let value = $("#"+this.element_id).val();
        let default_value = this.opt.default;

        if(!value && default_value)
        {
            return  this.reductionToType(default_value);
        }
        else
        {
            return this.reductionToType(value);
        }

    }

    /**
     * Добавляет колбек на событие onChange чтоб зависимые поля могли вовремя перестроиться
     * @param {function} callback
     * @returns {undefined}
     *
     * @example На пример так поле notes становится зависимым от поля name у проектов
     *  window.api.openapi.definitions.OneProject.properties.notes.dependsOn = ['name']
     */
    this.addOnChangeCallBack = function(callback)
    {
        this.onChange_calls.push(callback)
    }

    this._callAllonChangeCallback = function()
    {
        let val = this.getValue()
        for(let i in this.onChange_calls)
        {
            this.onChange_calls[i]({
                filed:this,
                opt:opt,
                value:val
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
        if(opt.onUpdateOptions)
        {
            if(typeof opt.onUpdateOptions != 'object')
            {
                opt.onUpdateOptions = [opt.onUpdateOptions]
            }

            for(let i in opt.onUpdateOptions)
            {
                opt.onUpdateOptions[i](this, arg)
            }
        }
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

guiElements.password = function()
{
    this.name = 'password'
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

    this._onBaseRender = this._onRender
    this._onRender = function(options)
    {
        this._onBaseRender(options)

        $('#'+this.element_id).select2({
            width: '100%',
        });
    }
}

guiElements.file = function(opt = {})
{
    this.name = 'file'
    guiElements.base.apply(this, arguments);

    this.getValue = function ()
    {
        return $('#fileContent_' + this.element_id).val();
    }
}

guiElements.boolean = function()
{
    this.name = 'boolean'
    guiElements.base.apply(this, arguments)

    this.getValue = function()
    {
        return $("#"+this.element_id).hasClass('selected');
    }
}

guiElements.html = function(opt = {})
{
    this.name = 'html'
    guiElements.base.apply(this, arguments)

    this.getValue = function()
    {
        return undefined;
    }
}

guiElements.textarea = function(opt = {})
{
    this.name = 'textarea';
    guiElements.base.apply(this, arguments)
}

guiElements.autocomplete = function()
{
    this.name = 'autocomplete'
    guiElements.base.apply(this, arguments)

    this.getValue = function()
    {
        if (this.matches &&
            this.opt.additionalProperties &&
            this.opt.additionalProperties.view_field &&
            this.opt.additionalProperties.value_field)
        {
            var value = $("#" + this.element_id).val();
            var data_value = $("#" + this.element_id).attr('value');
            var match = false;
            for (var i in this.matches)
            {
                if (value == this.matches[i]['view_field'] &&
                    data_value == this.matches[i]['value_field'])
                {
                    match = true;
                }
            }

            if (match)
            {
                return data_value;
            }
            else
            {
                return value
            }
        }
        else
        {
            return $("#" + this.element_id).val();
        }
    }

    this._onBaseRender = this._onRender
    this._onRender = function(options)
    {
        this._onBaseRender(options)

        if(options.searchObj)
        {
            return new autoComplete({
                selector: '#'+this.element_id,
                minChars: 0,
                cache:false,
                showByClick:true,
                menuClass:'autocomplete autocomplete-'+this.element_id,
                renderItem: function(item, search)
                {
                    return '<div class="autocomplete-suggestion" data-value="' + item.id + '" >' + item.name + '</div>';
                },
                onSelect: (event, term, item) =>
                {
                    var value = $(item).attr('data-value');
                    $('#'+this.element_id).val($(item).text());
                    $('#'+this.element_id).attr('value', value);
                    $('#'+this.element_id).attr({'data-hide':'hide'});
                },
                source: (original_term, response) =>
                {
                    var isHide = $('#'+this.element_id).attr('data-hide')
                    if(isHide == "hide")
                    {
                        $('#'+this.element_id).attr({'data-hide':'show'})
                        return;
                    }

                    // На основе текста из original_term сложить возможные вариант подсказок в массив matches
                    $.when(options.searchObj.search(original_term)).done((rawdata) => {

                        if(!rawdata || !rawdata.data || !rawdata.data.results)
                        {
                            response([])
                        }

                        if(options.matcher)
                        {
                            response(options.matcher(rawdata))
                            return;
                        }

                        response(rawdata.data.results)

                    }).fail(() => {
                        response([])
                    })
                }
            });
        }
        else if(options.enum)
        {
            return new autoComplete({
                selector: '#'+this.element_id,
                minChars: 0,
                cache:false,
                showByClick:true,
                menuClass:'autocomplete autocomplete-'+this.element_id,
                renderItem: function(item, search)
                {
                    return '<div class="autocomplete-suggestion" data-value="' + item + '" >' + item + '</div>';
                },
                onSelect: (event, term, item) =>
                {
                    var value = $(item).attr('data-value');
                    $('#'+this.element_id).val($(item).text());
                    $('#'+this.element_id).attr('value', value);
                    $('#'+this.element_id).attr({'data-hide':'hide'});
                },
                source: (original_term, response) =>
                {
                    var isHide = $('#'+this.element_id).attr('data-hide')
                    if(isHide == "hide")
                    {
                        $('#'+this.element_id).attr({'data-hide':'show'})
                        return;
                    }

                    var choices = options.enum;

                    var matches = [];
                    for(var i in choices)
                    {
                        if (choices[i].toLowerCase().indexOf(original_term.toLowerCase()) != -1)
                        {
                            matches.push(choices[i]);
                        }
                    }
                    response(matches);
                }
            });
        }
        else if(options.additionalProperties)
        {
            var obj;

            if(options.additionalProperties.$ref)
            {
                obj = getObjectBySchema(options.additionalProperties.$ref);
            }

            if(options.additionalProperties.model && options.additionalProperties.model.$ref)
            {
                obj = getObjectBySchema(options.additionalProperties.model.$ref);
            }

            if(options.additionalProperties.value_field && options.additionalProperties.view_field)
            {
                var value_field = options.additionalProperties.value_field;
                var view_field = options.additionalProperties.view_field;
            }

            return new autoComplete({
                selector: '#'+this.element_id,
                minChars: 0,
                delay:500,
                cache:false,
                showByClick:true,
                menuClass:'autocomplete autocomplete-'+this.element_id,
                renderItem: function(item, search)
                {
                    if(value_field && view_field)
                    {
                        return '<div class="autocomplete-suggestion" data-value="' + item.value_field + '" >' + item.view_field + '</div>';
                    }
                    else
                    {
                        return '<div class="autocomplete-suggestion" data-value="' + item + '" >' + item + '</div>';
                    }
                },
                onSelect: (event, term, item) =>
                {
                    var value = $(item).attr('data-value');
                    $('#'+this.element_id).val($(item).text());
                    $('#'+this.element_id).attr('value', value);
                    $('#'+this.element_id).attr({'data-hide':'hide'});
                },
                source: (original_term, response) =>
                {
                    var isHide = $('#'+this.element_id).attr('data-hide')
                    if(isHide == "hide")
                    {
                        $('#'+this.element_id).attr({'data-hide':'show'})
                        return;
                    }

                    if(obj)
                    {
                        var list = new obj.list();
                        var filters = spajs.urlInfo.data.reg;
                        filters.limit = 9999;

                        $.when(list.search(filters)).done((data) => {
                            var res = data.data.results;
                            var matches = [];
                            for(var i in res)
                            {
                                if(value_field && view_field)
                                {
                                    if (res[i][view_field].toLowerCase().indexOf(original_term.toLowerCase()) != -1)
                                    {
                                        matches.push({
                                            value_field: res[i][value_field],
                                            view_field: res[i][view_field],
                                        });
                                    }
                                }
                                else
                                {
                                    if (res[i].toLowerCase().indexOf(original_term.toLowerCase()) != -1)
                                    {
                                        matches.push(res[i]);
                                    }
                                }
                            }
                            this.matches = matches;
                            response(matches)
                        }).fail((e) => {
                            response([]);
                        });
                    }
                }
            });
        }
    }
}

guiElements.select2 = function(filed, filed_value, parent_object)
{
    this.name = 'select2'
    guiElements.base.apply(this, arguments)

    this._onBaseRender = this._onRender
    this._onRender = function(options)
    {
        this._onBaseRender(options)

        if(options.search)
        {
            $('#'+this.element_id).select2({
                width: '100%',
                ajax: {
                    transport: function (params, success, failure)
                    {
                        $.when(options.search(params, filed, filed_value, parent_object)).done((results) =>
                        {
                            /*
                             * {
                                "results": [
                                  {
                                    "id": 1,
                                    "text": "Option 1"
                                  },
                                  {
                                    "id": 2,
                                    "text": "Option 2"
                                  }
                                ],
                                "pagination": {
                                  "more": true
                                }
                              }
                             */
                            success(results)
                        }).fail(() => {
                            failure([])
                        })
                    }
                }
            });
        }
    }
}

guiElements.dynamic = function(opt = {}, value, parent_object)
{
    this.name = 'dynamic'
    guiElements.base.apply(this, arguments)


    if(!opt.dynamic_type)
    {
        opt.dynamic_type = 'string'
    }

    this.realElement = new guiElements[opt.dynamic_type]($.extend({}, opt, opt.override_opt), value, parent_object);

    let thisObj = this;
    let func = function(name)
    {
        return function(){ return thisObj.realElement[name].apply(thisObj.realElement, arguments)}
    }

    this.getValue = func('getValue')

    this.setType = function(type, override_opt)
    {
        if(!guiElements[type])
        {
            type = 'string'
            console.error("Error: Set type guiElements."+type+" for dynamic filed")
        }

        let lastValue = this.realElement.getValue();

        let options = $.extend({}, opt, override_opt);

        if(type == "boolean" && options.default !== undefined && options.readOnly)
        {
            lastValue = options.default;
        }

        this.realElement = new guiElements[type](options, value, parent_object);

        this.realElement.setValue(lastValue);
        $('#gui'+this.element_id).insertTpl(this.realElement.render());
    }

    this.opt.onUpdateOptions = [];
    this.opt.onUpdateOptions.push(function (filedObj, newValue) {

        var new_type = "string";
        var override_opt = {};
        var value = newValue.value;

        if(opt.additionalProperties && opt.additionalProperties.types)
        {
            var types = opt.additionalProperties.types;

            if(types[value])
            {
                new_type = types[value];
            }
        }

        if(opt.additionalProperties && opt.additionalProperties.choices)
        {
            var choices = opt.additionalProperties.choices;

            for (var i in choices)
            {
                if (i == value)
                {
                    if ($.isArray(choices[value]))
                    {
                        var boolean = false;
                        for (var i in choices[value])
                        {
                            if (typeof(choices[value][i]) == 'boolean')
                            {
                                boolean = true;
                            }
                        }

                        if (boolean)
                        {
                            new_type = "boolean";
                            if (choices[value].length == 1)
                            {
                                var boolean_default = choices[value][0];
                                override_opt.default = boolean_default;
                                override_opt.readOnly = true;
                            }
                        }
                        else
                        {
                            new_type = "enum";
                            override_opt = {enum: choices[value]};
                        }
                    }
                }
            }
        }

        thisObj.setType(new_type, override_opt);
    });

}


function set_api_options(options)
{
    let additional_options = "";
    if (options.readOnly) {
        additional_options += "readonly disabled "
    }

    if (options.minLength) {
        additional_options += "minlength=" + options.minLength + " "
    }

    if (options.maxLength) {
        additional_options += "maxlength=" + options.maxLength + " "
    }

    if (/^Required/.test(options.description)) {
        additional_options += "required "
    }

    if (options.default) {
        additional_options += "placeholder=" + options.default + " "
    }

    if (options.pattern) {
        additional_options += "pattern=" + options.pattern + " "
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