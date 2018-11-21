
function getFieldType(field, model, elements = undefined)
{
    if(!elements)
    {
        elements = window.guiElements
    }

    // Priority #1 is the prefetch fields
    if(field.prefetch && model && model.data && model.data[field.name + "_info"])
    {
        field[field.name + "_info"] = model.data[field.name + "_info"];
        field[field.name + "_info"]['prefetch_path'] = field.prefetch.path(model.data).replace(/^\/|\/$/g, '');
        return "prefetch";
    }

    // Priority №2 these are fields based on parent_name_format if they are defined in guiElements
    if(elements[field.parent_name_format])
    {
        /**
         * It is enough to declare such elements [field.parent_name_format] class to override the field
         */
        return field.parent_name_format
    }

    // Priority №3 These are fields based on parent_name_format if they are defined as a template.
    if(spajs.just.isTplExists("field_"+field.parent_name_format))
    {
        /**
         * It is enough to declare such a template to override the field.
         <script type="text/x-just" data-just="field_project_repository">
         <!-- field_project_repository -->
         <% debugger; %>
         </script>
         * @type String
         */
        return "named_template"
    }

    let type = undefined

    if(!type)
    {
        // Priority №4 это поля на основе format
        type = field.format
    }

    if(!type && field.enum !== undefined)
    {
        // Priority №5 these are enum fields
        type = 'enum'
    }

    if(!type)
    {
        // Priority №6 these are fields based on type
        type = field.type
    }

    if(elements[type])
    {
        return type
    }

    // If nothing is found at all then draw as a string.
    return "string";
}


var guiElements = {
}

guiElements.base = function(opt = {}, value, parent_object)
{
    this.opt = opt
    this.value = value
    this.db_value = value
    this.parent_object = parent_object
    if(!parent_object)
    {
        this.parent_object = {}
    }

    this.template_name = undefined
    this.element_id = ("field_"+ Math.random()+ "" +Math.random()+ "" +Math.random()).replace(/\./g, "")
    this.onChange_calls = []

    if(opt.on_change_calls)
    {
        for(let i in opt.on_change_calls)
        {
            this.onChange_calls.push(opt.on_change_calls[i])
        }
    }

    this.setValue = function(value)
    {
        this.value = value
    }

    this.isHidden = function()
    {
        return $('#gui'+this.element_id).hasClass('hide')
    }

    this.isRequired = function()
    {
        return this.opt.required
    }

    this.setHidden = function(value)
    {
        if(value)
        {
            $('#gui'+this.element_id).addClass('hide')
        }
        else
        {
            $('#gui'+this.element_id).removeClass('hide')
        }
    }

    /**
     * Function for inserting value into templates of guiElements.
     */
    this.insertValue = function(value)
    {
        if(value === undefined)
        {
            return this.opt.default || '';
        }

        if(typeof value == 'object')
        {
            if($.isArray(value))
            {
                return value.join(this.arr_divider || ", ");
            }

            return JSON.stringify(value)
        }

        return value
    }

    /**
     * Function is calling from GUI tests for value setting.
     * @param {string} value
     */
    this.insertTestValue = function(value)
    {
        $("#"+this.element_id).val(value+"")
        return value+"";
    }

    this._onUpdateValue = function(){}

    this.updateValue = function(value)
    {
        this.db_value = value
        this._onUpdateValue(value)
    }

    this.reductionToType = function(value)
    {
        let res = value

        if(this.isHidden())
        {
            if(!this.isRequired())
            {
                return undefined
            }
        }

        if(value === undefined && this.opt.default && this.isRequired())
        {
            return this.opt.default
        }

        if(value === undefined)
        {
            return undefined
        }

        if(this.render_options.type == "object")
        {
            res = value
            if(!value)
            {
                res = undefined
            }
        }

        if(this.render_options.type == "string" || this.render_options.type == "file")
        {
            if(!value || value == null)
            {
                res = ""
            }
            else
            {
                res = value.toString()
            }
        }

        if(this.render_options.type == "number" || this.render_options.type == "integer" )
        {
            if(value == "")
            {
                res = undefined;
            }
            else
            {
                res = value/1
            }
        }

        if(this.render_options.type == "boolean" )
        {
            res = value == true
        }

        if((res === undefined || res === "") && this.opt.default && this.isRequired())
        {
            res = this.opt.default
        }

        return res
    }

    this._onRender = function(options)
    {
        $('#'+this.element_id).on('change', false, () => {
            this._callAllonChangeCallback()
        })

        if(options.onclick)
        {
            let thisObj = this;
            $('#'+this.element_id).on('click', false, function()
            { 
                if(thisObj.blocked)
                {
                    return false;
                }

                let res = options.onclick.apply(thisObj, arguments)
                if(res)
                {
                    $('#'+thisObj.element_id).addClass('disabled')
                    thisObj.blocked = true
                    $.when(res).always(() =>
                    {
                        thisObj.blocked = false
                        $('#'+thisObj.element_id).removeClass('disabled')
                    })
                }
                else
                {
                    console.warn("Button onclick callback do not return promiss object.")
                }
            })
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

        if(!this.template_name || !spajs.just.isTplExists(this.template_name))
        {
            this.template_name = "guiElements."+this.name
        }

        if(this.render_options.hideReadOnly && this.render_options.readOnly)
        {
            return "<!-- hidden field guiElements."+this.name+" hideReadOnly && readOnly -->";
        }

        return spajs.just.render(this.template_name, {opt:this.render_options, guiElement:this, value:this.value}, () => {
            this._onRender(this.render_options)
            this._callAllonChangeCallback()
            this.rendered = true
        });
    }

    this.getValue = function()
    {
        let value = $("#"+this.element_id).val();
        return this.reductionToType(value);
    }

    /**
     * Вернёт значение только правильное, если оно не правильное то будет исключение
     * @returns {undefined|Number|String|Boolean|guiElements.base.getValidValue.value}
     */
    this.getValidValue = function()
    {
        let value = this.getValue()

        let field = this.render_options

        let value_length = 0
        if(value)
        {
            value_length = value.toString().length
        }

        if(field.maxLength && value_length > field.maxLength)
        {
            throw {error:'validation', message:'Field "'+field.name +'" is too long'}
        }

        if(field.minLength)
        {
            if(value_length == 0)
            {
                if(this.isRequired())
                {
                    throw {error:'validation', message:'Field "'+field.name +'" is empty'}
                }
                else
                {
                    return undefined
                }
            }

            if(value_length < field.minLength)
            {
                throw {error:'validation', message:'Field "'+field.name +'" is too short'}
            }
        }

        if(field.max && value > field.max)
        {
            throw {error:'validation', message:'Field "'+field.name +'" is too big'}
        }

        if(field.min && value < field.min)
        {
            throw { error: 'validation', message: 'Field "' + field.name + '" is too small' }
        }

        if(value === undefined && this.isRequired() && !this.opt.default)
        {
            throw {error:'validation', message:'Field "'+field.name +'" is required'}
        }

        return value;
    }

    /**
     * Добавляет колбек на событие onChange чтоб зависимые поля могли вовремя перестроиться
     * @param {function} callback
     * @returns {undefined}
     */
    this.addOnChangeCallBack = function(callback)
    {
        this.onChange_calls.push(callback)
    }

    if(this.opt.onchange)
    {
        this.addOnChangeCallBack(this.opt.onchange)
    }


    this._callAllonChangeCallback = function()
    {
        let val = this.getValue()
        for(let i in this.onChange_calls)
        {
            if(typeof this.onChange_calls[i] == "string")
            {
                window[this.onChange_calls[i]]({
                    field:this,
                    opt:opt,
                    value:val
                })
            }
            else
            {
                this.onChange_calls[i]({
                    field:this,
                    opt:opt,
                    value:val
                })
            }
        }
    }
    /**
     * Вызывается для перестройки поля в тот момент когда поле от которого мы зависим поменяло значение
     * @param {function} callback
     * @returns {undefined}
     */
    this.updateOptions = function(arg)
    {
        if(this.onUpdateOptions)
        {
            if(typeof this.onUpdateOptions != 'object')
            {
                this.onUpdateOptions = [this.onUpdateOptions]
            }

            for(let i in this.onUpdateOptions)
            {
                this.onUpdateOptions[i](this, arg)
            }
        }
    }

    if(this.opt.onInit)
    {
        this.opt.onInit.apply(this, arguments)
    }
}

guiElements.string = function()
{
    this.name = 'string'
    guiElements.base.apply(this, arguments)
}

guiElements.color = function()
{
    this.name = 'color'
    guiElements.base.apply(this, arguments)
}

guiElements.named_template = function()
{
    this.name = 'named_template'
    guiElements.base.apply(this, arguments)

    this.template_name = "field_" + this.opt.parent_name_format
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

    this.getValue = function()
    {
        return this.reductionToType(this.value);
    }
}

guiElements.formButton = function()
{
    guiElements.button.apply(this, arguments)
    this.name = 'formButton'
}

guiElements.enum = function(opt = {}, value)
{
    this.name = 'enum'
    guiElements.base.apply(this, arguments)

    this._onBaseRender = this._onRender
    this._onRender = function(options)
    {
        this._onBaseRender(options)

        if(!options.readOnly)
        {
            $('#'+this.element_id).select2({
                width: '100%',
            });
        }
    }

    /**
     * Function is calling from GUI tests for value setting.
     * @param {string} value
     */
    this.insertTestValue = function(value)
    {
        let options = $("#"+this.element_id+" option[value="+value+"]")
        if(options.length == 0)
        {
            return null;
        }

        $("#"+this.element_id).val(value).trigger('change');
        return value
    }

}

guiElements.file = function(opt = {})
{
    this.name = 'file'
    guiElements.base.apply(this, arguments);

    this.getValue = function ()
    {
        let value = $('#fileContent_' + this.element_id).val();
        return this.reductionToType(value);
    }

    /**
     * Function is calling from GUI tests for value setting.
     * @param {string} value
     */
    this.insertTestValue = function(value)
    {
        $("#fileContent_"+this.element_id).val(value)
        return value;
    }

    this.readFile = function (event, el_id)
    {
        return readFileAndInsert(event, el_id)
    }
}

guiElements.secretfile = function(opt = {})
{
    this.name = 'secretfile'
    guiElements.file.apply(this, arguments);
}

guiElements.boolean = function()
{
    this.name = 'boolean'
    guiElements.base.apply(this, arguments)

    this.getValue = function()
    {
        let value = $("#"+this.element_id).hasClass('selected');
        return this.reductionToType(value);
    }

    /**
     * Function is calling from GUI tests for value setting.
     * @param {string} value
     */
    this.insertTestValue = function(value)
    {
        if(value)
        {
            $("#"+this.element_id).addClass('selected')
            return true
        }

        $("#"+this.element_id).removeClass('selected')
        return false
    }

    /**
     * Function is supposed to be called from guiElement template
     * to make a decision about adding selected CSS class or not.
     */
    this.setSelectedOrNot = function(value, opt)
    {
        if(value !== undefined)
        {
            return value;
        }

        if(opt && opt.default)
        {
            return opt.default;
        }

        return false;
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

    this.insertTestValue = function(value)
    {
        return undefined;
    }

    this._onBaseRender = this._onRender;
    this._onRender = function(options)
    {
        this._onBaseRender(options);
        this.setLinksInsideField();
    }

    this.setLinksInsideField = function()
    {
        let links_array = $('#' + this.element_id).find('a');
        let id_reg_exp = XRegExp(`#(?<id>[A-z0-9,\-]+)$`);
        for(let i in links_array)
        {
            let link = links_array[i];
            if(link['href'] && link['href'].search(window.hostname) != -1)
            {
                let match = XRegExp.exec(link['href'], id_reg_exp)
                if(match && link['href'].search(window.location.href) == -1 && $('*').is('#' + match['id']))
                {
                    link.onclick = function ()
                    {
                        $(".wrapper").scrollTo('#' + match['id'], 700);
                        return false;
                    }
                    continue;
                }

                if(link['href'].search(window.location.href) == -1)
                {
                    link['href'] = window.location.href + link['href'].split(window.hostname)[1];
                }

            }
        }
    }

    this._onUpdateValue = function()
    {
        this.setLinksInsideField();
    }
}

guiElements.textarea = function(opt = {})
{
    this.name = 'textarea';
    guiElements.base.apply(this, arguments)
}

guiElements.text_paragraph = function(opt = {})
{
    this.name = 'text_paragraph'
    guiElements.base.apply(this, arguments)

    this.arr_divider = "\n";
}

/**
 * Поле которое не видимо но хранит значение
 * @param {type} opt
 * @returns {guiElements.null}
 */
guiElements.hidden = function(opt = {})
{
    this.name = 'hidden';
    guiElements.base.apply(this, arguments)
}

/**
 * Поле которое не возвращает значение
 * @param {type} opt
 * @returns {guiElements.null}
 */
guiElements.null = function(opt = {})
{
    this.name = 'null';
    guiElements.base.apply(this, arguments)
    this.getValue = function()
    {
        return undefined;
    }

    this.insertTestValue = function(value)
    {
        return undefined;
    }
}

guiElements.integer = function(opt = {}, value)
{
    this.name = 'integer';
    guiElements.base.apply(this, arguments)

    this.getValue = function ()
    {
        let value = $('#' + this.element_id).val();
        return this.reductionToType(value/1);
    }

    this.insertTestValue = function(value)
    {
        $("#"+this.element_id).val(value/1)
        return value/1;
    }
}

guiElements.int32 = guiElements.integer
guiElements.int64 = guiElements.integer
guiElements.double = guiElements.integer
guiElements.number = guiElements.integer
guiElements.float = guiElements.integer


guiElements.prefetch = function (opt = {}, value)
{
    this.name = 'prefetch';
    guiElements.base.apply(this, arguments)

    this.updateValue = function(value, allData)
    {
        this.render_options[this.opt.name +"_info"] = $.extend(this.render_options[this.opt.name +"_info"], allData[this.opt.name +"_info"])

        this.db_value = value
        this._onUpdateValue(value)
    }

    this.getValue = function()
    {
        return this.reductionToType($("#"+this.element_id).attr('attr-value'));
    }
}

guiElements.date = function (opt = {}, value)
{
    this.name = 'date';
    guiElements.base.apply(this, arguments)

    this.getValue = function()
    {
        let value = $("#"+this.element_id).val();
        return this.reductionToType(moment(value).tz(window.timeZone).format("YYYY/MM/DD"));
    }

    this.insertTestValue = function(value)
    {
        let time  = moment(value).tz(window.timeZone).format("YYYY-MM-DD")
        $("#"+this.element_id).val(time)
        return moment(value).tz(window.timeZone).format("YYYY/MM/DD");
    }
}

guiElements.date_time = function (opt = {}, value)
{
    this.name = 'date_time';
    guiElements.base.apply(this, arguments)

    this.getValue = function()
    {
        let value = $("#"+this.element_id).val();
        return this.reductionToType(moment(value).tz(window.timeZone).format());
    }

    this.insertTestValue = function(value)
    {
        let time  = moment(value).tz(window.timeZone).format("YYYY-MM-DD") + 'T' + moment(value).tz(window.timeZone).format("HH:mm")
        $("#"+this.element_id).val(time)
        return moment(value).tz(window.timeZone).format();
    }
}

/**
 * Field that gets time in seconds as value and shows it in convenient way for user.
 * Due to size of time field selects one of the most appropriate pattern from these templates:
 * - 23:59:59
 * - 01d 00:00:00
 * - 01m 30d 00:00:00
 * - 99y 11m 30d 22:23:24
 * Function getValue returns time in seconds.
 */
guiElements.uptime = function (opt = {}, value)
{
    this.name = 'uptime';
    guiElements.base.apply(this, arguments)

    this.getValue = function()
    {
        let value = $("#"+this.element_id).val();

        let reg_arr = [
            XRegExp(`(?<y>[0-9]+)[y] (?<m>[0-9]+)[m] (?<d>[0-9]+)[d] (?<hh>[0-9]+):(?<mm>[0-9]+):(?<ss>[0-9]+)`),
            XRegExp(`(?<m>[0-9]+)[m] (?<d>[0-9]+)[d] (?<hh>[0-9]+):(?<mm>[0-9]+):(?<ss>[0-9]+)`),
            XRegExp(`(?<d>[0-9]+)[d] (?<hh>[0-9]+):(?<mm>[0-9]+):(?<ss>[0-9]+)`),
            XRegExp(`(?<hh>[0-9]+):(?<mm>[0-9]+):(?<ss>[0-9]+)`),
        ]

        let time_parts = [];
        let uptime_in_seconds =  0;

        for(let i in reg_arr)
        {
            time_parts = XRegExp.exec(value, reg_arr[i]);
            if(time_parts != null)
            {
                let duration_obj = {
                    seconds: Number(time_parts['ss']),
                    minutes:  Number(time_parts['mm']),
                    hours:  Number(time_parts['hh']),
                    days: Number(time_parts['d'] || 0),
                    months: Number(time_parts['m'] || 0),
                    years: Number(time_parts['y'] || 0),
                }
                uptime_in_seconds = moment.duration(duration_obj).asSeconds();
                return this.reductionToType(uptime_in_seconds)
            }
        }

        return this.reductionToType(uptime_in_seconds);
    }

    this.getValueInSeconds = function()
    {
        return Number($("#"+this.element_id).attr('sec-value')) || 0;
    }

    this.changeOnChangeByHands = function()
    {
        let new_value = thisObj.getValue();
        if(new_value != 0)
        {
            $("#"+thisObj.element_id).attr('sec-value', new_value);
        }
    }

    this.uptimeSettings = {
        timeout: 100,
        iteration: 1,
        mouseDown: false,
    }

    this.valueUp = function (increement)
    {
        let new_time = this.getValueInSeconds();

        new_time = new_time + increement
        if(new_time >= 3155759999)
        {
            new_time = 0
        }
        $("#"+this.element_id).attr('sec-value', new_time);
        $("#"+this.element_id).val(this.getTimeInUptimeFormat(new_time))
    }

    this.valueDown = function (increement)
    {
        let new_time = this.getValueInSeconds();
        new_time = new_time - increement
        if(new_time < 0)
        {
            new_time = 0
        }
        $("#"+this.element_id).attr('sec-value', new_time);
        $("#"+this.element_id).val(this.getTimeInUptimeFormat(new_time))
    }

    this.mousePress = function(obj, func)
    {
        obj.unbind('mousedown');
        obj.unbind('mouseup');
        obj.unbind('mouseleave');
        obj.bind('mousedown', () => {
            this.uptimeSettings.mouseDown = true;
            setTimeout(func, this.uptimeSettings.timeout);
        });

        obj.bind('mouseup', () =>  {
            this.uptimeSettings.mouseDown = false;
            this.uptimeSettings.iteration = 1;
        });

        obj.bind('mouseleave', () =>  {
            this.uptimeSettings.mouseDown = false;
            this.uptimeSettings.iteration = 1;
        });
    }

    let thisObj = this;
    this.doIncrease = function()
    {
        if (thisObj.uptimeSettings.mouseDown)
        {
            let increement = thisObj.getIncrement(thisObj.uptimeSettings.iteration);
            thisObj.valueUp(increement)
            thisObj.uptimeSettings.iteration++;
            setTimeout(thisObj.doIncrease, thisObj.uptimeSettings.timeout);
        }
    }

    this.doDecrease = function()
    {
        if (thisObj.uptimeSettings.mouseDown)
        {
            let increement = thisObj.getIncrement(thisObj.uptimeSettings.iteration);
            thisObj.valueDown(increement)
            thisObj.uptimeSettings.iteration++;
            setTimeout(thisObj.doDecrease, thisObj.uptimeSettings.timeout);
        }
    }

    this.getIncrement = function(iteration)
    {
        let increement = 1;

        if(iteration >= 20){
            increement = 10;
        }

        if(iteration >= 30){
            increement = 100;
        }

        if(iteration >= 40){
            increement = 1000;
        }
        return  increement;
    }

    this.maskObj = {
        mask:[
            {
                mask:'HH:mm:SS',
                blocks: {
                    HH: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 23
                    },
                    mm: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 59
                    },
                    SS: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 59
                    }
                },
            },
            {
                mask:'DAYd HH:mm:SS',
                blocks: {
                    DAY: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 31
                    },
                    HH: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 23
                    },
                    mm: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 59
                    },
                    SS: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 59
                    }
                },
            },
            {
                mask:'MONTHm DAYd HH:mm:SS',
                blocks: {
                    MONTH: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 12
                    },
                    DAY: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 31
                    },
                    HH: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 23
                    },
                    mm: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 59
                    },
                    SS: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 59
                    }
                },
            },
            {
                mask:'YEARy MONTHm DAYd HH:mm:SS',
                blocks: {
                    YEAR: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 99
                    },
                    MONTH: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 12
                    },
                    DAY: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 31
                    },
                    HH: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 23
                    },
                    mm: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 59
                    },
                    SS: {
                        mask: IMask.MaskedRange,
                        from: 0,
                        to: 59
                    }
                },
            },
        ],
    }

    this.getTimeInUptimeFormat = function(time)
    {
        if(isNaN(time))
        {
            return "00:00:00";
        }

        let uptime = moment.duration(Number(time), 'seconds')._data;

        let n = oneCharNumberToTwoChar;

        if(uptime.years > 0)
        {
            return n(uptime.years) + "y " + n(uptime.months) + "m " + n(uptime.days) + "d " + n(uptime.hours) + ":" + n(uptime.minutes) + ":" + n(uptime.seconds)

        } else if(uptime.months > 0)
        {
            return n(uptime.months) + "m " + n(uptime.days) + "d " + n(uptime.hours) + ":" + n(uptime.minutes) + ":" + n(uptime.seconds)
        }
        else if(uptime.days > 0)
        {
            return n(uptime.days) + "d " + n(uptime.hours) + ":" + n(uptime.minutes) + ":" + n(uptime.seconds)
        }
        else
        {
            return n(uptime.hours) + ":" + n(uptime.minutes) + ":" + n(uptime.seconds)
        }
    }

    this._onBaseRender = this._onRender;
    this._onRender = function(options)
    {
        this._onBaseRender(options);

        if(!options.readOnly)
        {
            let element = document.getElementById(this.element_id);
            let momentMask = new IMask(element, this.maskObj);
            this.mousePress($('#uptime-up'), thisObj.doIncrease);
            this.mousePress($('#uptime-down'),thisObj.doDecrease);
        }
    }
}


/*
 * Field that gets time in milliseconds and convert it into seconds before render.
 * Before sending data to API it converts time from seconds to milliseconds.
 */
guiElements.time_interval = function(opt = {}, value)
{
    this.name = 'time_interval';
    guiElements.base.apply(this, arguments)

    this.value = value / 1000
    this.db_value = value / 1000

    this._baseGetValue = this.getValue

    this.getValue = function()
    {
        let value = this._baseGetValue();
        return this.reductionToType(value * 1000);
    }

    this._baseinsertTestValue = this.insertTestValue
    this.insertTestValue = function(value)
    {
        return this._baseinsertTestValue(value/1) * 1000;
    }
}

guiElements.autocomplete = function()
{
    this.name = 'autocomplete'
    guiElements.base.apply(this, arguments)

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
                    let value = $(item).attr('data-value');
                    $('#'+this.element_id).val(value);
                    $('#'+this.element_id).attr('value', value);
                    $('#'+this.element_id).attr({'data-hide':'hide'});
                },
                source: (original_term, response) =>
                {
                    let search_str = trim(original_term);

                    let isHide = $('#'+this.element_id).attr('data-hide')
                    if(isHide == "hide")
                    {
                        $('#'+this.element_id).attr({'data-hide':'show'})
                        return;
                    }

                    $.when(options.searchObj.search(search_str)).done((rawdata) => {

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
        /*
         * options.autocomplete_properties - object, which comes from api.
         * This object has info about model and fields, where data for autocomplete is stored.
         */
        else if(options.autocomplete_properties || options.dynamic_properties)
        {
            if(options.dynamic_properties)
            {
                let properties = mergeDeep(options.autocomplete_properties, options.dynamic_properties)
                options.autocomplete_properties = properties

            }

            let props = getInfoFromAdditionalProperties(options);

            let value_field = props['value_field'];
            let view_field = props['view_field'];
            if (!Array.isArray(props['obj']))
            {
                props['obj'] = [props['obj']]
            }


            let list = [];

            let url_vars = {}
            if (options.dynamic_properties && options.dynamic_properties.url_vars)
            {
                url_vars = options.dynamic_properties.url_vars
            }

            if(props['obj'])
            {
                for (let i in props['obj'])
                {
                    list.push(new guiObjectFactory(props['obj'][i],
                        url_vars)
                    );
                }
            }

            return new autoComplete({
                selector: '#'+this.element_id,
                minChars: 0,
                delay:350,
                cache:false,
                showByClick:true,
                menuClass:'autocomplete autocomplete-'+this.element_id,
                renderItem: function(item, search)
                {
                    return '<div class="autocomplete-suggestion" data-value="' + item.value_field + '" >' + item.view_field + '</div>';
                },
                onSelect: (event, term, item) =>
                {
                    let value = $(item).attr('data-value');
                    $('#'+this.element_id).val(value);
                    $('#'+this.element_id).attr('value', value);
                    $('#'+this.element_id).attr({'data-hide':'hide'});
                },
                source: (original_term, response) =>
                {
                    let search_str = trim(original_term);

                    let isHide = $('#'+this.element_id).attr('data-hide')
                    if(isHide == "hide")
                    {
                        $('#'+this.element_id).attr({'data-hide':'show'})
                        return;
                    }

                    if(list)
                    {

                        let filters = getFiltersForAutocomplete(list, search_str, view_field);
                        let lists_deffered =[]
                        for (let i in list)
                        {
                            lists_deffered.push(list[i].search(filters))
                        }

                        $.when.apply($, lists_deffered).done(function() {

                            let matches = [];

                            for (let i=0; i<arguments.length; i++)
                            {
                                let res = arguments[i].data.results;

                                for(let i in res)
                                {
                                    matches.push({
                                        value_field: res[i][value_field],
                                        view_field: res[i][view_field],
                                    });

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

guiElements.autocomplete.prepareProperties = function(value)
{
    if(value.enum)
    {
        return value
    }

    if(!value.additionalProperties)
    {
        console.error("AdditionalProperties was not found");
        return value;
    }

    value.autocomplete_properties = {
        view_field:value.additionalProperties.view_field,
        value_field:value.additionalProperties.value_field,
        list_obj:{
            $ref:value.additionalProperties.model.$ref
        },
    }
    value.gui_links.push({
        prop_name:'autocomplete_properties',
        list_name:'list_obj',
        $ref:value.additionalProperties.model.$ref
    })

    return value
}

guiElements.hybrid_autocomplete = function(field, field_value, parent_object)
{
    this.name = 'hybrid_autocomplete'
    guiElements.base.apply(this, arguments)

    this.renderModal = function (options)
    {
        let def = new $.Deferred();

        if(options.autocomplete_properties || options.dynamic_properties)
        {
            if (options.dynamic_properties)
            {
                let properties = mergeDeep(options.autocomplete_properties, options.dynamic_properties)
                options.autocomplete_properties = properties
            }

            let props = getInfoFromAdditionalProperties(options);

            let value_field = props['value_field'];
            let view_field = props['view_field'];

            let list = undefined;

            if (props['obj'])
            {
                list = new guiObjectFactory(props['obj']);
            }

            let filters = {};

            if(options.search_query)
            {
                filters = getFiltersForAutocomplete(list);

                for(let i in options.search_query)
                {
                    filters.search_query[i] = options.search_query[i];
                }
                if(options.page_num)
                {
                    filters.offset = options.page_num * guiLocalSettings.get('page_size');
                }
            }
            else
            {
                filters = getFiltersForAutocomplete(list);
                if(options.page_num)
                {
                    filters.offset = options.page_num * guiLocalSettings.get('page_size');
                }
            }

            $.when(list.search(filters)).done(data => {
                let modal_opt = {
                    title: 'Select ' + list.api.name,
                };
                list.model.data = data.data;
                list.model.filters = {};

                let render_options = {};
                render_options.fields = list.api.schema.list.fields
                render_options.base_path = list.api.path.format({pk:list.url_vars.api_pk}).slice(1,-1);
                render_options.base_href = render_options.base_path;

                if(!render_options.page_type) render_options.page_type = 'list'

                render_options.selectionTag =  list.api.selectionTag
                window.guiListSelections.initTag(render_options.selectionTag)

                render_options.autocomplete_properties = options.autocomplete_properties;

                list.model.filters = filters;

                let html = spajs.just.render('hybrid_autocomplete_modal', {query:"", guiObj:list, guiElement:this, opt:render_options });
                guiModal.setModalHTML(html, modal_opt);
                guiModal.modalOpen();
                def.resolve();
            }).fail(e => {
                def.reject(e);
            })
        }
        else
        {
            def.reject();
        }

        return def.promise()
    }

    this.getValue = function()
    {
        if(this.opt && this.opt.custom_getValue)
        {
            return this.reductionToType(this.opt.custom_getValue.apply(this, arguments));
        }
        else
        {
            let view_field_value = $("#" + this.element_id).val();
            let value_field_value = $("#" + this.element_id).attr('value');

            if(value_field_value)
            {
                return this.reductionToType(value_field_value);
            }

            return this.reductionToType(view_field_value);
        }
    }

    this.getValueFromModal = function(tag)
    {
        let id = window.guiListSelections.getSelection(tag);
        if(id.length != 0)
        {
            let view_field_name = $('.modal-item-'+id[0]).attr('data-view-field-name');
            let view_field_value = $('.modal-item-'+id[0]).attr('data-view-value');

            let value_field_name = $('.modal-item-'+id[0]).attr('data-value-field-name');
            let value_field_value = $('.modal-item-'+id[0]).attr('data-value-value');

            $('#' + this.element_id).attr('value', value_field_value);
            $('#' + this.element_id).val(view_field_value);

        }
        else
        {
            $('#' + this.element_id).attr('value', '');
            $('#' + this.element_id).val('');
        }

        $('#' + this.element_id).trigger('change');
        window.guiListSelections.unSelectAll(tag);
        guiModal.modalClose();
    }


    this._onBaseRender = this._onRender
    this._onRender = function(options)
    {
        this._onBaseRender(options);

        if(options.autocomplete_properties || options.dynamic_properties)
        {
            if (options.dynamic_properties)
            {
                let properties = mergeDeep(options.autocomplete_properties, options.dynamic_properties)
                options.autocomplete_properties = properties

            }

            let props = getInfoFromAdditionalProperties(options);

            let value_field = props['value_field'];
            let view_field = props['view_field'];


            let list = undefined;

            if (props['obj'])
            {
                list = new guiObjectFactory(props['obj']);
            }

            if(field_value)
            {
                let filters = getFiltersForAutocomplete(list, field_value, value_field);
                $.when(list.search(filters)).done(data => {
                    if(data.data && data.data.results)
                    {
                        $('#' + this.element_id).attr('value', data.data.results[0][value_field]);
                        $('#' + this.element_id).val(data.data.results[0][view_field]);
                    }
                }).fail(e => {
                    $('#' + this.element_id).attr('value', '');
                    $('#' + this.element_id).val(field_value);
                })
            }
        }
    }
}

guiElements.hybrid_autocomplete.prepareProperties = guiElements.autocomplete.prepareProperties


guiElements.select2 = function(field, field_value, parent_object)
{
    this.name = 'select2'
    guiElements.base.apply(this, arguments)

    this._onBaseRender = this._onRender
    this._onRender = function(options)
    {
        this._onBaseRender(options)
        /*
         * options.search - function for JS hardcode, which aim is to redefine way of getting data for select2.
         * @param {object} params - argument from select2 transport function
         * @param {object} field - field to which we want add select2
         * @param {integer/string} field_value - value of field
         * @param {object} parent_object - object (one) - model of single object page
         * @returns Deferred object
         *
         * Example of hardcode:
         * tabSignal.connect("openapi.factory.ansiblemodule", function(data)
         * {
         *      let field = apiansiblemodule.one.view.definition.properties.inventory;
         *      field.format = "select2"
         *      field.search = function(params, field, field_value, parent_object)
         *      {
         *          //some code here
         *      }
         * });
         */
        if(options.search)
        {
            return $('#'+this.element_id).select2({
                width: '100%',
                ajax: {
                    transport: function (params, success, failure)
                    {
                        $.when(options.search(params, field, field_value, parent_object)).done((results) =>
                        {
                            if(options.autocomplete_properties && options.autocomplete_properties.default_value)
                            {
                                results.push(options.autocomplete_properties.default_value)
                            }

                            success(results)
                        }).fail((e) => {

                            let results =[];
                            if(options.autocomplete_properties && options.autocomplete_properties.default_value)
                            {
                                results.push(options.autocomplete_properties.default_value)
                            }

                            failure(results)
                        })
                    }
                }
            });
        }
        /*
         * options.autocomplete_properties - object, which comes from api.
         * This object has info about model and fields, where data for select2 is stored.
         */
        else if(options.autocomplete_properties || options.dynamic_properties)
        {
            if(options.dynamic_properties)
            {
                let properties = mergeDeep(options.autocomplete_properties, options.dynamic_properties)
                options.autocomplete_properties = properties
            }

            let props = getInfoFromAdditionalProperties(options);

            let value_field = props['value_field'];
            let view_field = props['view_field'];

            if (!Array.isArray(props['obj']))
            {
                props['obj'] = [props['obj']]
            }

            let list = [];

            let url_vars = {}
            if (options.dynamic_properties && options.dynamic_properties.url_vars)
            {
                url_vars = options.dynamic_properties.url_vars
            }

            if(props['obj'])
            {
                let thisObj = this;

                for (let i in props['obj'])
                {
                    list.push(new guiObjectFactory(props['obj'][i],
                        url_vars)
                    );
                }

                if(field_value)
                {
                    let filters = getFiltersForAutocomplete(list, field_value, value_field);
                    let lists_deffered = [];
                    for (let i in list)
                    {
                        lists_deffered.push(list[i].search(filters))
                    }

                    $.when.apply($, lists_deffered).done(function() {
                        for (let i=0; i<arguments.length; i++)
                        {
                            try
                            {
                                let option_data = {
                                    id: arguments[i].data.results[0][value_field],
                                    text: arguments[i]. data.results[0][view_field],
                                }

                                let newOption = new Option(option_data.text, option_data.id, false, false);

                                $('#' + thisObj.element_id).append(newOption).trigger('change');
                            }
                            catch (e)
                            {
                                console.warn(e);
                            }
                        }
                    })
                }

                $('#'+this.element_id).select2({
                    width: '100%',
                    ajax: {
                        delay: 350,
                        transport: function (params, success, failure)
                        {
                            let search_str = trim(params.data.term);

                            let filters = getFiltersForAutocomplete(list, search_str, view_field);
                            let lists_deffered = [];
                            for (let i in list)
                            {
                                lists_deffered.push(list[i].search(filters))
                            }
                            $.when.apply($, lists_deffered).done(function() {

                                let results =[];
                                if(options.autocomplete_properties && options.autocomplete_properties.default_value)
                                {
                                    results.push(options.autocomplete_properties.default_value)
                                }

                                for (let i=0; i<arguments.length; i++)
                                {
                                    let api_data = arguments[i].data.results;
                                    for (let i in api_data) {
                                        results.push(
                                            {
                                                id: api_data[i][value_field],
                                                text: api_data[i][view_field]
                                            }
                                        )
                                    }
                                }

                                success({results:results})
                            }).fail((e) => {

                                let results =[];
                                if(options.autocomplete_properties && options.autocomplete_properties.default_value)
                                {
                                    results.push(options.autocomplete_properties.default_value)
                                }

                                failure(results)
                            })
                        }
                    }
                });
            }
        }
    }
}

guiElements.select2.prepareProperties = guiElements.autocomplete.prepareProperties

guiElements.apiObject = function(field, field_value, parent_object)
{
    this.name = 'apiObject'
    guiElements.base.apply(this, arguments)

    this.createLinkedObj = function()
    {
        if(this.opt.definition.page)
        {
            return new guiObjectFactory(this.opt.definition.page, this.parent_object.url_vars, this.db_value)
        }
        else if(this.opt.definition.list && this.opt.definition.list.page)
        {
            return new guiObjectFactory(this.opt.definition.list.page, undefined, this.db_value)
        }

        return undefined
    }
    this._onUpdateValue = function(value)
    {
        this.linkObj = this.createLinkedObj()
    }

    this.insertTestValue = function(value)
    {
        return this.getValue();
    }

    this._baseRender = this.render
    this.render = function(options)
    {
        this.linkObj = this.createLinkedObj()
        return this._baseRender.apply(this, arguments)
    }

    this.getLink = function()
    {
        if(!this.linkObj || !this.db_value || !this.db_value.id)
        {
            return "#"
        }

        let url = this.linkObj.api.path.replace(/\/(\{[A-z]+\})\/$/, "\/"+this.db_value.id).replace(/^\//, "");
        if(this.linkObj.url_vars)
        {
            for(let i in this.linkObj.url_vars)
            {
                if(/^api_/.test(i))
                {
                    url = url.replace("{"+i.replace("api_", "")+"}", this.linkObj.url_vars[i])
                }
            }
        }

        return vstMakeLocalUrl(url)
    }

    this.getName = function()
    {
        if(!this.linkObj)
        {
            if(!this.db_value || !this.db_value.id)
            {
                return "#"
            }

            if(this.db_value.name)
            {
                return this.db_value.name
            }

            return this.db_value.id
        }

        // opt.definition.list.path %>/<%- value.id %>
        return this.linkObj.getTitle()
    }
}


guiElements.apiData = function(field, field_value, parent_object)
{
    this.name = 'apiData'
    guiElements.base.apply(this, arguments)
}

guiElements.inner_api_object = function(field, field_value, parent_object)
{
    this.name = 'inner_api_object'
    guiElements.base.apply(this, arguments)

    this.realElements = {};

    for(let i in field.properties)
    {
        let prop = field.properties[i];

        if(prop.$ref)
        {
            let objName = getObjectNameBySchema(prop);
            let obj = getObjectDefinitionByName(api.openapi, objName, field.name);

            this.realElements[i] = {}

            for(let j in obj.properties)
            {
                let inner_field = obj.properties[j];
                let inner_field_type = inner_field.type;

                if(inner_field.format && guiElements[inner_field.format])
                {
                    inner_field_type = inner_field.format;
                }

                if(!guiElements[inner_field_type])
                {
                    inner_field_type = 'string';
                }

                let inner_field_value;
                if(field_value && field_value[i])
                {
                    inner_field_value = field_value[i][j];
                }

                if(Object.keys(obj.properties).length == 1)
                {
                    inner_field.title = i + " - " + inner_field.title;
                }

                let realElement = new guiElements[inner_field_type]($.extend({}, inner_field), inner_field_value, parent_object);

                this.realElements[i][j] = realElement;
            }
        }
    }

    this.getValue = function()
    {
        let valueObj = {};
        for(let obj_name in this.realElements)
        {
            valueObj[obj_name] = {}
            let obj = this.realElements[obj_name];
            for(let element_name in obj)
            {
                let element = this.realElements[obj_name][element_name];
                valueObj[obj_name][element_name] = element.getValue();
            }
        }

        return this.reductionToType(valueObj);
    }

    this.getValidValue = function ()
    {
        let valueObj = {};
        for(let obj_name in this.realElements)
        {
            valueObj[obj_name] = {}
            let obj = this.realElements[obj_name];
            for(let element_name in obj)
            {
                let element = this.realElements[obj_name][element_name];
                valueObj[obj_name][element_name] = element.getValidValue();
            }
        }

        return valueObj;
    }
}

guiElements.json = function(opt = {}, value)
{
    /*
     * This field is only for 1-level json-objects.
     */

    this.name = 'json'
    guiElements.base.apply(this, arguments)

    this.realElements = {};
    this.setValue = function(value)
    {
        this.value = value
        let realElements = {};
        if(value)
        {
            for(let field in value)
            {
                let options = {
                    readOnly: opt.readOnly || false,
                    title: field,
                }

                let type = 'string';

                if(typeof value[field] == 'boolean')
                {
                    type = 'boolean';
                }

                realElements[field] = new guiElements[type]($.extend({}, options), value[field]);
            }
        }

        this.realElements = realElements

    }
    this.setValue(value)

    this.insertTestValue = function(value)
    {
        this.setValue(value);
        return value;
    }

    this.getValue = function()
    {
        let valueObj = {};
        for(let element_name in this.realElements)
        {
            let element = this.realElements[element_name];
            valueObj[element_name] = element.getValue();
        }

        return this.reductionToType(valueObj);
    }

    this.getValidValue = function()
    {
        let valueObj = {};
        for(let element_name in this.realElements)
        {
            let element = this.realElements[element_name];
            valueObj[element_name] = element.getValidValue();
        }

        return valueObj;
    }
}

guiElements.dynamic = function(opt = {}, value, parent_object)
{
    let thisObj = this;
    this.name = 'dynamic'
    guiElements.base.apply(this, arguments)

    if(!this.opt.dynamic_type)
    {
        this.opt.dynamic_type = 'string'
    }

    let override_options = $.extend({}, this.opt, this.opt.override_opt)
    override_options.onInit = undefined

    this.realElement = new guiElements[this.opt.dynamic_type](override_options, value, parent_object);

    let func = function(name)
    {
        return function(){ return thisObj.realElement[name].apply(thisObj.realElement, arguments)}
    }

    this.getValue = func('getValue')

    this.getValidValue = func('getValidValue')

    this.setType = function(type, override_opt)
    {
        if(!guiElements[type])
        {
            type = 'string'
            console.error("Error: Set type guiElements."+type+" for dynamic field")
        }

        let lastValue = this.realElement.getValue();

        let options = $.extend({}, opt, override_opt);
        options.onInit = undefined;
        options.type = type;

        if(type == "boolean" && options.default !== undefined && options.readOnly)
        {
            lastValue = options.default;
        }

        if(type == "boolean" && typeof lastValue == "string")
        {
            lastValue = stringToBoolean(lastValue)
        }

        if((type == "number" || type == "integer") && lastValue == "")
        {
            lastValue = 0;
        }

        this.realElement = new guiElements[type](options, value, parent_object);

        this.realElement.addOnChangeCallBack(function(){
            thisObj._callAllonChangeCallback()
        })

        this.realElement.setValue(lastValue);
        $('#gui'+this.element_id).insertTpl(this.realElement.render());

    }

    this.onUpdateOptions = [];
    this.onUpdateOptions.push(function (fieldObj, newValue)
    {
        var new_type = "string";
        var override_opt = {};
        var value = newValue.value;

        if(opt.dynamic_properties && opt.dynamic_properties.callback)
        {

            var res = opt.dynamic_properties.callback.apply(thisObj, arguments);

            if(res && res.format)
            {
                thisObj.setType(res.format, res.override_opt);
                return;
            }
            if(res && res.type)
            {
                thisObj.setType(res.type, res.override_opt);
                return;
            }
        }

        if(thisObj.opt.dynamic_properties && thisObj.opt.dynamic_properties.types)
        {
            var types = thisObj.opt.dynamic_properties.types;

            if(types[value])
            {
                new_type = types[value];
            }
        }

        if(thisObj.opt.dynamic_properties && thisObj.opt.dynamic_properties.choices)
        {
            var choices = thisObj.opt.dynamic_properties.choices;

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

    /**
     * Function is calling from GUI tests for value setting.
     * @param {string} value
     */
    this.insertTestValue = function()
    {
        return this.realElement.insertTestValue.apply(this.realElement, arguments);
    }

}

guiElements.dynamic.prepareProperties = function(value)
{

    if(!value.dynamic_properties)
    {
        value.dynamic_properties = {}
    }

    if(value.additionalProperties)
    {
        let dynamic_properties = mergeDeep(
            value.dynamic_properties,
            {
                types:value.additionalProperties.types,
                choices:value.additionalProperties.choices,
            })
        value.dynamic_properties = dynamic_properties
    }

    return value
}


guiElements.crontab = function (opt = {}, value)
{
    this.name = 'crontab'
    guiElements.base.apply(this, arguments)

    this.model = {}

    this.model.MonthsNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    this.model.DaysOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    this.model.Months = {}
    this.model.DayOfMonth = {}
    this.model.DaysOfWeek = {}
    this.model.Hours = {}
    this.model.Minutes = {}

    this.model.MonthsStr = "*"
    this.model.DayOfMonthStr = "*"
    this.model.DaysOfWeekStr = "*"
    this.model.HoursStr = "*"
    this.model.MinutesStr = "*"

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

        if(this.render_options.description === undefined)
        {
            this.render_options.description = "Time must be specified according to " + window.timeZone + " time zone";
        }
        this.parseCronString(this.db_value);
        return spajs.just.render("guiElements."+this.name, {opt:this.render_options, guiElement: this, value: this.value }, () => {
            this._onRender();
            this._callAllonChangeCallback();
        });
    }

    this._onRender = function ()
    {
        $("#"+this.element_id).on('change', false, () => {
            this.parseCronString($("#"+this.element_id).val());
        })

        $("#"+this.element_id).on('paste', () => {

            setTimeout(
                () => {
                    let val = $("#"+this.element_id).val();
                    this.parseCronString(val);
                },100)
        })
    }

    this.parseCronString = function(string)
    {
        if(string !== undefined)
        {
            this.value = string
        }

        var string = trim(this.value).split(" ");
        if(string.length != 5 || /[A-z]/.test(this.value))
        {
            this.value = "* * * * *";
            string = trim(this.value).split(" ");

        }

        this.model.MinutesStr = string[0]
        this.model.HoursStr = string[1]
        this.model.DayOfMonthStr = string[2]
        this.model.MonthsStr = string[3]
        this.model.DaysOfWeekStr = string[4]


        this.parseItem(this.model.Minutes, this.model.MinutesStr, 0, 59)
        this.parseItem(this.model.Hours, this.model.HoursStr, 0, 23)
        this.parseItem(this.model.DayOfMonth, this.model.DayOfMonthStr, 1, 31)
        this.parseItem(this.model.Months, this.model.MonthsStr, 1, 12)
        this.parseItem(this.model.DaysOfWeek, this.model.DaysOfWeekStr, 0, 6)

    }

    this.setDaysOfWeek = function(value)
    {
        this.value = this.value.replace(/^([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+)/img, '$1 $2 $3 $4 '+value);
        this.parseCronString();
        this.setValue();
    }

    this.setMonths = function(value)
    {
        this.value = this.value.replace(/^([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+)/img, '$1 $2 $3 '+value+' $5');
        this.parseCronString();
        this.setValue();
    }

    this.setDayOfMonth = function(value)
    {
        this.value = this.value.replace(/^([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+)/img, '$1 $2 '+value+' $4 $5');
        this.parseCronString();
        this.setValue();
    }

    this.setHours = function(value)
    {
        this.value = this.value.replace(/^([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+)/img, '$1 '+value+' $3 $4 $5');
        this.parseCronString();
        this.setValue();
    }

    this.setMinutes = function(value)
    {
        this.value = this.value.replace(/^([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+)/img, value+' $2 $3 $4 $5');
        this.parseCronString();
        this.setValue();
    }

    /**
     * Парсит отдельный элемент в cron строке
     * @param {type} resArr
     * @param {type} str
     * @param {type} minInt
     * @param {type} maxInt
     * @returns {Array}
     */
    this.parseItem = function(resArr, str, minInt, maxInt)
    {
        for(var i=minInt; i< maxInt; i++)
        {
            resArr[i] = false;
        }

        for(var i in resArr)
        {
            resArr[i] = false;
        }

        if(!str)
        {
            str = "*";
        }

        var Parts = str.split(",")
        for(var i in Parts)
        {
            if(/^\*$/.test(Parts[i]))
            {
                if(minInt < maxInt)
                {
                    for(var j = minInt; j <= maxInt; j++)
                    {
                        resArr[j] = true
                    }
                }
            }
            else if(/^\*\/([0-9]+)$/.test(Parts[i]))
            {
                var match = /^\*\/([0-9]+)$/.exec(Parts[i])
                if(minInt < maxInt && match[1]/1 >= 1)
                {
                    for(var j = minInt; j <= maxInt; j+= match[1]/1)
                    {
                        resArr[j] = true
                    }
                }
            }
            else if(/^([0-9]+)-([0-9]+)$/.test(Parts[i]))
            {
                var match = /^([0-9]+)-([0-9]+)$/.exec(Parts[i])
                if(match[1]/1 > maxInt)
                {
                    match[1] = minInt
                }
                if(match[2]/1 > maxInt)
                {
                    match[2] = maxInt
                }

                if(match[1]/1 < match[2]/1)
                {
                    for(var j = match[1]/1; j <= match[2]/1; j++)
                    {
                        resArr[j] = true
                    }
                }
            }
            else if(/^([0-9]+)$/.test(Parts[i]))
            {
                if(Parts[i]/1 <= maxInt && Parts[i]/1 >= minInt)
                {
                    resArr[Parts[i]/1] = true
                }
            }
            else if(/^([0-9]+)\/([0-9]+)$/.test(Parts[i]))
            {
                var match = /^([0-9]+)\/([0-9]+)$/.exec(Parts[i])
                if(match[1]/1 > maxInt)
                {
                    match[1] = minInt
                }
                if(match[1]/1 < maxInt && match[2]/1 >= 1)
                {
                    for(var j = match[1]/1; j <= maxInt; j+=match[2]/1)
                    {
                        resArr[j] = true
                    }
                }
            }
            else if(/^([0-9]+)-([0-9]+)\/([0-9]+)$/.test(Parts[i]))
            {
                var match = /^([0-9]+)-([0-9]+)\/([0-9]+)$/.exec(Parts[i])
                if(match[1]/1 > maxInt)
                {
                    match[1] = minInt
                }
                if(match[2]/1 > maxInt)
                {
                    match[2] = maxInt
                }

                if(match[1]/1 < match[2]/1 && match[3]/1 >= 1)
                {
                    for(var j = match[1]/1; j <= match[2]/1; j+=match[3]/1)
                    {
                        resArr[j] = true
                    }
                }
            }
        }



        return resArr;
    }

    this.getValue = function()
    {
        this.setValue()
        return this.reductionToType(this.value);
    }

    this.compileItem = function(resArr, minInt, maxInt)
    {
        var itemResults = []
        itemResults.push(resArr.join(","))
        if(!resArr || !resArr.length || resArr.length == maxInt - minInt + 1)
        {
            return "*";
        }

        if(resArr.length)
        {
            var division = [];
            for(var j=2; j<maxInt/2; j++)
            {
                var isInner = false
                for(var k in division)
                {
                    if(j % division[k] == 0)
                    {
                        isInner = true;
                    }
                }

                if(isInner)
                {
                    continue;
                }

                var isOk = true
                for(var i=minInt; i<maxInt; i+=j)
                {
                    if(resArr.indexOf(i) == -1)
                    {
                        isOk = false;
                        break;
                    }
                }

                if(isOk)
                {
                    division.push(j);
                }
            }

            var exclude = []
            var includeParts = []
            for(var i in division)
            {
                for(var j=minInt; j<maxInt; j+=division[i])
                {
                    exclude.push(j)
                }
                includeParts.push("*/"+division[i])
            }

            var lastVal = -1;
            var range = [];

            for(var i in resArr)
            {
                if(exclude.indexOf(resArr[i]) != -1)
                {
                    continue;
                }

                if(lastVal + 1 == resArr[i] )
                {
                    range.push(resArr[i])
                }
                else
                {
                    if(range.length > 2)
                    {
                        includeParts.push(range[0] + "-" + range[range.length-1])
                    }
                    else if(range.length)
                    {
                        for(var l in range)
                        {
                            includeParts.push(range[l])
                        }
                    }
                    range = [resArr[i]]
                }

                lastVal = resArr[i]
            }

            if(range.length > 2)
            {
                includeParts.push(range[0] + "-" + range[range.length-1])
            }
            else if(range.length)
            {
                for(var l in range)
                {
                    includeParts.push(range[l])
                }
            }
            itemResults.push(includeParts.join(","))
        }

        if(resArr.length)
        {
            var lastVal = -1;
            var includeParts = []
            var range = []
            for(var i in resArr)
            {
                if(lastVal + 1 == resArr[i] )
                {
                    range.push(resArr[i])
                }
                else
                {
                    if(range.length > 2)
                    {
                        includeParts.push(range[0] + "-" + range[range.length-1])
                    }
                    else if(range.length)
                    {
                        for(var l in range)
                        {
                            includeParts.push(range[l])
                        }
                    }
                    range = [resArr[i]]
                }

                lastVal = resArr[i]
            }

            if(range.length > 2)
            {
                includeParts.push(range[0] + "-" + range[range.length-1])
            }
            else if(range.length)
            {
                for(var l in range)
                {
                    includeParts.push(range[l])
                }
            }

            itemResults.push(includeParts.join(","))
        }

        var minLength = 99999;
        var minLengthResult = "";
        for(var i in itemResults)
        {
            if(itemResults[i].length < minLength )
            {
                minLength = itemResults[i].length
                minLengthResult = itemResults[i]
            }
        }

        return minLengthResult;
    }

    this.setValue = function()
    {
        //
        // DaysOfWeek
        //
        var DaysOfWeek = []
        for(var i in this.model.DaysOfWeek)
        {
            if(this.model.DaysOfWeek[i])
            {
                DaysOfWeek.push(i/1);
            }
        }
        this.model.DaysOfWeekStr = this.compileItem(DaysOfWeek, 0, 6);

        //
        // Months
        //
        var Months = []
        for(var i in this.model.Months)
        {
            if(this.model.Months[i])
            {
                Months.push(i/1);
            }
        }
        this.model.MonthsStr = this.compileItem(Months, 1, 12);

        //
        // DayOfMonth
        //
        var DayOfMonth = []
        for(var i in this.model.DayOfMonth)
        {
            if(this.model.DayOfMonth[i])
            {
                DayOfMonth.push(i/1);
            }
        }
        this.model.DayOfMonthStr = this.compileItem(DayOfMonth, 1, 31);

        //
        // Hours
        //
        var Hours = []
        for(var i in this.model.Hours)
        {
            if(this.model.Hours[i])
            {
                Hours.push(i/1);
            }
        }
        this.model.HoursStr = this.compileItem(Hours, 0, 23);

        //
        // Minutes
        //
        var Minutes = []
        for(var i in this.model.Minutes)
        {
            if(this.model.Minutes[i])
            {
                Minutes.push(i/1);
            }
        }
        this.model.MinutesStr = this.compileItem(Minutes, 0, 59);

        this.value =  this.model.MinutesStr
            + " " + this.model.HoursStr
            + " " + this.model.DayOfMonthStr
            + " " + this.model.MonthsStr
            + " " + this.model.DaysOfWeekStr;

        $("#"+this.element_id).val(this.value)
    }
}

guiElements.form = function(opt = {}, value, parent_object)
{
    this.name = 'form'
    guiElements.base.apply(this, arguments)

    this.realElements = {};

    this.prepareFieldOptions = function(field)
    {
        if(field.enum)
        {
            field.format = "enum"
        }

        return field
    }

    this.setValue = function(value)
    {
        this.value = value
        let realElements = {};
        if(value.form)
        {
            for(let i in value.form)
            {
                let field = value.form[i]
                field.name = i

                field = this.prepareFieldOptions(field)
                let type = getFieldType(field)

                realElements[i] = new guiElements[type]($.extend(true, {}, field), field.value);
            }
        }

        this.realElements = realElements
    }

    if(opt.form && !value)
    {
        this.setValue(opt)
    }
    else
    {
        this.setValue(value)
    }

    this.insertTestValue = function(value)
    {
        this.setValue(value);
        return value;
    }

    this.getValue = function()
    {
        let valueObj = {};
        for(let element_name in this.realElements)
        {
            let element = this.realElements[element_name];
            valueObj[element_name] = element.getValue();
        }

        return this.reductionToType(valueObj);
    }

    this.getValidValue = function()
    {
        let valueObj = {};
        for(let element_name in this.realElements)
        {
            let element = this.realElements[element_name];
            valueObj[element_name] = element.getValidValue();
        }

        return this.reductionToType(valueObj);
    }
}

function set_api_options(options, guiElement)
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

    if (options.min) {
        additional_options += "min=" + options.min + " "
    }

    if (options.max) {
        additional_options += "max=" + options.max + " "
    }

    if (guiElement && guiElement.isRequired()) {
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

function getInfoFromAdditionalProperties(options)
{
    let obj, value_field, view_field;

    obj = options.autocomplete_properties.list_obj

    if(options.autocomplete_properties.value_field && options.autocomplete_properties.view_field)
    {
        value_field = options.autocomplete_properties.value_field;
        view_field = options.autocomplete_properties.view_field;
    }

    return {
        obj: obj,
        value_field: value_field,
        view_field: view_field,
    }
}

function getFiltersForAutocomplete(list, search_str, view_field)
{
    let filters = {
        limit:20,
        offset:0,
        search_query:{

        }
    };

    if(search_str)
    {
        filters['search_query'][view_field] = search_str;
    }

    return filters;
}

/**
 * Function makes search through the list in hybrid_autocomplete modal.
 * @param object - obj - list of objects, that is used in hybrid_autocomplete modal.
 * @param object - guiElement - hybrid_autocomplete guiElement.
 * @param object - opt - object of options for modal rendering.
 * @param string - query - search query value.
 */
function goToSearchModal(obj, guiElement, opt, query)
{
    let def = new $.Deferred();
    if (obj.isEmptySearchQuery(query))
    {
        $.when(guiElement.renderModal(opt)).done(d => {
            def.resolve();
        }).fail(e => {
            def.reject(e);
        })
    }
    else
    {
        opt.search_query = obj.searchStringToObject(obj.searchObjectToString(trim(query)));

        $.when(guiElement.renderModal(opt)).done(d => {
            def.resolve();
        }).fail(e => {
            def.reject(e);
        })
    }

    return def.promise();
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