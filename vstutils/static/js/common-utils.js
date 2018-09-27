/**
 * Function to replace {.+?} in string to variables sended to this function,
 * array and single variable set ordered inside string
 * associative array and iterable objects set value for keys that original string have
 * @param takes array, associative array or single variable and insert it
 * @returns {String} - return string with inserted arguments
 */
String.prototype.format = function()
{
    let obj = this.toString();
    let arg_list;
    if (typeof arguments[0] == "object")
    {
        arg_list = arguments[0]
    }
    else if (arguments.length > 1)
    {
        arg_list = Array.from(arguments);
    }
    for (let key of this.format_keys())
    {
        if (arg_list[key] != undefined)
        {
            obj = obj.replace('{'+ key + '}', arg_list[key])
        }
        else
        {
            throw "String don't have \'" + key + "\' key";
        }
    }
    return obj;
}

/**
 * Function search and return all `{key}` in string
 * @returns {array} array of {key} in string
 */
String.prototype.format_keys = function()
{
    let thisObj = this;
    let regex = new RegExp("(?<={).+?(?=})", "g");
    return thisObj.match(regex) || [];
}


// Список файлов тестирующих ГУЙ
if(!window.guiTestsFiles)
{
    window.guiTestsFiles = []
}

// Добавляем файл тестов к списку файлов для тестов гуя
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/qUnitTest.js')
//window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/dashboard.js')
window.guiTestsFiles.push(hostname + window.guiStaticPath + 'js/tests/guiElements.js')



// Запускает тесты гуя
function loadQUnitTests()
{
    loadAllUnitTests(window.guiTestsFiles)
}

// Загружает и запускает тесты гуя в строгом порядке.
function loadAllUnitTests(urls)
{
    let promises = []
    for(let i in urls)
    {
        let def = new $.Deferred();
        promises.push(def.promise());

        var link = document.createElement("script");
        link.setAttribute("type", "text/javascript");
        link.setAttribute("src", urls[i]+'?r='+Math.random());

        link.onload = function(def){
            return function(){
                def.resolve();
            }
        }(def)
        document.getElementsByTagName("head")[0].appendChild(link);

        break;
    }

    $.when.apply($, promises).done(() => {
        //injectQunit()

        if(urls.length == 1)
        {
            return injectQunit()
        }
        urls.splice(0, 1)
        loadAllUnitTests(urls)
    })
}


function addslashes(string) {
    return string.replace(/\\/g, '\\\\').
    replace(/\u0008/g, '\\b').
    replace(/\t/g, '\\t').
    replace(/\n/g, '\\n').
    replace(/\f/g, '\\f').
    //replace(/\r/g, '\\r').
    //replace(/\a/g, '\\a').
    replace(/\v/g, '\\v').
    //replace(/\e/g, '\\e').
    replace(/'/g, '\\\'').
    replace(/"/g, '\\"');
}

function stripslashes (str) {
    //       discuss at: http://locutus.io/php/stripslashes/
    //      original by: Kevin van Zonneveld (http://kvz.io)
    //      improved by: Ates Goral (http://magnetiq.com)
    //      improved by: marrtins
    //      improved by: rezna
    //         fixed by: Mick@el
    //      bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
    //      bugfixed by: Brett Zamir (http://brett-zamir.me)
    //         input by: Rick Waldron
    //         input by: Brant Messenger (http://www.brantmessenger.com/)
    // reimplemented by: Brett Zamir (http://brett-zamir.me)
    //        example 1: stripslashes('Kevin\'s code')
    //        returns 1: "Kevin's code"
    //        example 2: stripslashes('Kevin\\\'s code')
    //        returns 2: "Kevin\'s code"
    return (str + '')
        .replace(/\\(.?)/g, function (s, n1) {
            switch (n1) {
                case '\\':
                    return '\\'
                case '0':
                    return '\u0000'
                case 't':
                    return "\t"
                case 'n':
                    return "\n"
                case 'f':
                    return "\f"
                //case 'e':
                //  return "\e"
                case 'v':
                    return "\v"
                //case 'a':
                //  return "\a"
                case 'b':
                    return "\b"
                //case 'r':
                //  return "\r"
                case '':
                    return ''
                default:
                    return n1
            }
        })
}
/**
 * Тестовый тест, чтоб было видно что тесты вообще хоть как то работают.
 */
function trim(s)
{
    if(s) return s.replace(/^ */g, "").replace(/ *$/g, "")
    return '';
}


function inheritance(obj, constructor)
{
    var object = undefined;
    var item = function()
    {
        if(constructor)
        {
            return constructor.apply(jQuery.extend(true, item, object), arguments);
        }

        return jQuery.extend(true, item, object);
    }

    object = jQuery.extend(true, item, obj)

    return object
}

function toIdString(str)
{
    return str.replace(/[^A-z0-9\-]/img, "_").replace(/[\[\]]/gi, "_");
}

function hidemodal()
{
    var def = new $.Deferred();
    $(".modal.fade.in").on('hidden.bs.modal', function (e) {
        def.resolve();
    })
    $(".modal.fade.in").modal('hide');

    return def.promise();
}


function capitalizeString(string)
{
    if(!string)
    {
        return "";
    }

    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

function sliceLongString(string="", valid_length=100)
{
    if(!string || !string.slice)
    {
        return string;
    }

    var str = string.slice(0, valid_length);
    if(string.length > valid_length)
    {
        str += "...";
    }

    return str;
}

function isEmptyObject(obj)
{
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            return false;
        }
    }
    return true;
}

function readFileAndInsert(event, element)
{
    for (var i = 0; i < event.target.files.length; i++)
    {
        if (event.target.files[i].size > 1024 * 1024 * 1)
        {
            guiPopUp.error("File is too large")
            console.log("File is too large " + event.target.files[i].size)
            continue;
        }

        var reader = new FileReader();

        reader.onload = function (e)
        {
            $(element).val(e.target.result);
        }

        reader.readAsText(event.target.files[i]);
    }

    return false;
}

function addCssClassesToElement(element="", title, type)
{
    element = element.replace(/[\s\/]+/g,'-');

    let class_list = element + " ";

    if(title)
    {
        title = title.replace(/[\s\/]+/g,'-');
        class_list += element + "_" + title + " ";
    }


    if(title && type)
    {
        type = type.replace(/[\s\/]+/g,'-');
        class_list += element + "_" + type + " ";
        class_list += element + "_" + type + "_" + title;
    }

    return class_list.toLowerCase();
}

function addStylesAndClassesToListField(guiObj, field, data, opt)
{
    let output = "";

    if(field.style)
    {
        output += field.style.apply(guiObj, [data, opt]) + " ";
    }

    if(field.class)
    {
        output += field.class.apply(guiObj, [data, opt]) + " ";
    }
    else
    {
        output += "class='" + addCssClassesToElement('column', guiObj.api.name_field, guiObj.api.short_name) + "' ";
    }

    return output;
}

function turnTableTrIntoLink(event)
{
    if(!(event.target.classList.contains('highlight-tr-none') ||
            event.target.classList.contains('ico-on') ||
            event.target.classList.contains('ico-off'))
    )
    {
        let href;
        if(event.target.hasAttribute('href'))
        {
            href =  event.target.getAttribute('href');
        }
        else
        {
            href =  event.currentTarget.getAttribute('data-href');
        }
        vstGO(href);
    }
}

/*
 * Hides field 'id' in list.
 * This function is calling from signal openapi.schema.type.list
 */
function hideIdInList(listObj)
{
    try
    {
        let fields = listObj.value.schema.list.fields;
        if(fields['id'])
        {
            fields['id'].hidden = true;
        }
    }
    catch(e)
    {
        console.warn(e);
    }

}

tabSignal.connect("openapi.schema.type.list", function(listObj)
{
    hideIdInList.apply(this, arguments);
})


window.onresize=function ()
{
    if(window.innerWidth>767)
    {
        if(guiLocalSettings.get('hideMenu'))
        {
            $("body").addClass('sidebar-collapse');
        }
        if ($("body").hasClass('sidebar-open'))
        {
            $("body").removeClass('sidebar-open');
        }
    }
    else
    {
        if ($("body").hasClass('sidebar-collapse')){
            $("body").removeClass('sidebar-collapse');
        }
    }
}

var guiLocalSettings = {
    __settings:{
    },
    get:function(name){
        return this.__settings[name];
    },
    set:function(name, value){
        this.__settings[name] = value;
        window.localStorage['guiLocalSettings'] = JSON.stringify(this.__settings)
        tabSignal.emit('guiLocalSettings.'+name, {type:'set', name:name, value:value})
    },
    setIfNotExists:function(name, value)
    {
        if(this.__settings[name] === undefined)
        {
            this.__settings[name] = value;
        }
    }
}

if(window.localStorage['guiLocalSettings'])
{
    try{
        guiLocalSettings.__settings = window.localStorage['guiLocalSettings'];
        guiLocalSettings.__settings = JSON.parse(guiLocalSettings.__settings)

    }catch (e)
    {

    }
}

function getNewId(){
    return ("id_"+ Math.random()+ "" +Math.random()+ "" +Math.random()).replace(/\./g, "")
}




String.prototype.formatUnicorn = String.prototype.formatUnicorn ||
function () {
    "use strict";
    var str = this.toString();
    if (arguments.length) {
        var t = typeof arguments[0];
        var key;
        var args = ("string" === t || "number" === t) ?
            Array.prototype.slice.call(arguments)
            : arguments[0];

        for (key in args) {
            str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key]);
        }
    }

    return str;
};

window.url_delimiter = "?"
function vstMakeLocalUrl(url, vars = {})
{
    if(Array.isArray(url))
    {
        url = url.join("/")
    }

    if(typeof url == "string")
    {
        debugger;
        let new_url = url.formatUnicorn(vars)
        new_url = new_url.replace(/\{([A-z0-9]+)\}/g, "{api_$1}")
        new_url = new_url.formatUnicorn(vars)

        if(new_url.indexOf(window.hostname) != 0 && new_url.indexOf("//") != 0)
        {
            new_url = window.hostname + window.url_delimiter + new_url
        }
        else
        {
            console.error("window.hostname already exist in vstMakeLocalUrl")
        }
        return new_url
    }
    else
    {
        debugger;
        throw "Error in vstMakeLocalUrl"
    }

    return url
}


function vstGO()
{
    return spajs.openURL(vstMakeLocalUrl.apply(this, arguments))
}