
// Если количество не обязательных полей больше или равно чем hide_non_required то они будут спрятаны
guiLocalSettings.setIfNotExists('hide_non_required', 4)

// Количество элементов на странице
guiLocalSettings.setIfNotExists('page_size', 20)


function getMenuIdFromApiPath(path){
    return path.replace(/[^A-z0-9\-]/img, "_")//+Math.random()
}

function guiTestUrl(regexp, url)
{ 
    url = url.replace(/[/#]*$/, "").replace(/^\//, "")
    var reg_exp = new RegExp(regexp)
    if(!reg_exp.test(url))
    {
        return false;
    }

    return reg_exp.exec(url)
}

all_regexp = []
function guiGetTestUrlFunctionfunction(regexp, api_path_value)
{
    all_regexp.push({path:api_path_value.path , regexp:regexp})

    return function(url)
    {
        var res = guiTestUrl(regexp, url)
        if(!res)
        {
            return false;
        }

        var obj = res.groups
        obj.url = res[0]                 // текущий урл в блоке
        obj.page_and_parents = res[0]    // страница+родители

        if(obj.page_and_parents)
        {
            var match = obj.page_and_parents.match(/(?<parent_type>[A-z]+)\/(?<parent_id>[0-9]+)\/(?<page_type>[A-z\/]+)$/)

            if(match && match.groups)
            {
                obj.parent_type = match.groups.parent_type
                obj.parent_id = match.groups.parent_id
                obj.page_type = match.groups.page_type.replace(/\/[A-z]+$/, "")
                obj.page_name = match.groups.page_type
            }
        }

        obj.searchURL = function(query){
            if(this.search_part)
            {
              return vstMakeLocalUrl(this.page_and_parents.replace(this.search_part, "") + "/search/" + query);
            }
            return vstMakeLocalUrl(this.page_and_parents + "/search/" + query);
        }

        obj.baseURL = function(){
            return vstMakeLocalUrl(this.page.replace(/\/[^/]+$/, ""));
        }
        
        obj.getApiPath = function (){
            return {api:api_path_value, url:this}
        }

        return obj
    }
}

/**
 * По пути в апи определяет ключевое имя для регулярного выражения урла страницы
 * @param {type} api_path
 * @returns {getNameForUrlRegExp.url}
 */
function getNameForUrlRegExp(api_path)
{
    var url = api_path.replace(/\{([A-z]+)\}\//g, "(?<api_$1>[0-9,]+)\/").replace(/\/$/, "").replace(/^\//, "").replace(/\//g, "\\/")
    return url;
}

/**
 * Создаёт страницу экшена
 * @param {Object} api
 * @param {Object} api_path
 * @param {Object} action
 * @returns {undefined}
 * @deprecated Надо бы объеденить и унифицировать код так чтоб он был един ещё и для openApi_add_one_page_path
 */
function openApi_add_one_action_page_path(api_obj)
{
    let api_path = api_obj.path

    // Страница элемента вложенного куда угодно
    let page_url_regexp = "^(?<parents>[A-z]+\\/[0-9]+\\/)*(?<page>"+getNameForUrlRegExp(api_path.toLowerCase().replace(/\/([A-z0-9]+)\/$/, "/"))+")\\/(?<action>"+api_obj.name+")$"
    let regexp_in_other = guiGetTestUrlFunctionfunction(page_url_regexp, api_obj);

    spajs.addMenu({
        id:getMenuIdFromApiPath(api_path),
        url_parser:[regexp_in_other],
        priority:api_obj.level,
        debug: api_obj.path,
        onOpen:function(holder, menuInfo, data)
        {
            let pageItem = new guiObjectFactory(api_obj)

            var def = new $.Deferred();
            $.when(pageItem).done(function()
            {
                def.resolve(pageItem.renderAsPage())
            }).fail(function(err)
            {
                def.resolve(renderErrorAsPage(err));
            })

            return def.promise();
        },
    })
}

/**
 * Создаёт страницу объекта
 * @param {Object} api
 * @param {Object} api_path
 * @param {Object} pageMainBlockObject
 * @param {Number} urlLevel
 * @returns {undefined}
 */
function openApi_add_one_page_path(api_obj)
{
    let api_path = api_obj.path

    // Определяем тип страницы из урла (есть у него id в конце или нет)
    let page_url_regexp = "^(?<parents>[A-z]+\\/[0-9]+\\/)*(?<page>"+getNameForUrlRegExp(api_path)+")$"

    // Страница элемента вложенного куда угодно
    let regexp_in_other = guiGetTestUrlFunctionfunction(page_url_regexp, api_obj);

    spajs.addMenu({
        id:getMenuIdFromApiPath(api_path),
        url_parser:[regexp_in_other],
        priority:api_obj.level,
        onOpen:function(holder, menuInfo, data)
        {
            let pageItem = new guiObjectFactory(api_obj)

            var def = new $.Deferred();
            $.when(pageItem.load(data.reg)).done(function()
            {
                def.resolve(pageItem.renderAsPage())
            }).fail(function(err)
            {
                def.resolve(renderErrorAsPage(err));
            })

            return def.promise();
        },
    })
}


/**
 * Создаёт страницу списка и страницу с формой создания объекта
 * @param {Object} api
 * @param {Object} api_path
 * @param {Object} pageMainBlockObject
 * @param {Number} urlLevel
 * @returns {undefined}
 */
//
function openApi_add_list_page_path(api_obj)
{

    let path_regexp = []
    let api_path = api_obj.path

    let pathregexp = "^"
        +"(?<page_and_parents>"
        +"(?<parents>[A-z]+\\/[0-9]+\\/)*"
        +"(?<page>"+getNameForUrlRegExp(api_path)+"))"
        +"(?<search_part>\\/search\\/(?<search_query>[A-z0-9 %\-.:,=]+)){0,1}"
        +"(?<page_part>\\/page\\/(?<page_number>[0-9]+)){0,1}$"

    path_regexp.push(guiGetTestUrlFunctionfunction(pathregexp, api_obj))

    // Проверяем есть ли возможность создавать объекты
    if(api_obj.canCreate)
    {
        // Если есть кнопка создать объект то надо зарегистрировать страницу создания объекта
        let new_page_url = guiGetTestUrlFunctionfunction("^(?<parents>[A-z]+\\/[0-9]+\\/)*(?<page>"+getNameForUrlRegExp(api_path)+")\\/new$", api_obj)

        spajs.addMenu({
            id:getMenuIdFromApiPath(api_path + "_new"),
            url_parser:[new_page_url],
            priority:api_obj.level,
            onOpen:function(holder, menuInfo, data)
            {
                let pageItem = new guiObjectFactory(api_obj)

                var def = new $.Deferred();
                $.when(pageItem).done(function()
                {
                    def.resolve(pageItem.renderAsNewPage())
                }).fail(function(err)
                {
                    def.resolve(renderErrorAsPage(err));
                })

                return def.promise();
            },
        })

    }

    // Страница добавления под элементов
    if(api_obj.canAdd)
    {
        // Если есть кнопка создать объект то надо зарегистрировать страницу создания объекта
        var add_page_url = guiGetTestUrlFunctionfunction("^(?<page_and_parents>(?<parents>[A-z]+\\/[0-9]+\\/)*(?<page>"+getNameForUrlRegExp(api_path)+"\\/add))(?<search_part>\\/search\\/(?<search_query>[A-z0-9 %\-.:,=]+)){0,1}(?<page_part>\\/page\\/(?<page_number>[0-9]+)){0,1}$", api_obj)

        spajs.addMenu({
            id:getMenuIdFromApiPath(api_path + "_add"),
            url_parser:[add_page_url],
            priority:api_obj.level,
            onOpen:function(holder, menuInfo, data)
            {
                let pageItem = new guiObjectFactory(api_obj.shortestURL)
                let filter = $.extend(true, data.reg)
                filter.parent_id = undefined
                filter.parent_type = undefined

                var def = new $.Deferred();
                $.when(pageItem.search(filter)).done(function()
                {
                    def.resolve(pageItem.renderAsAddSubItemsPage())
                }).fail(function(err)
                {
                    def.resolve(renderErrorAsPage(err));
                })

                return def.promise();
            },
        })
    }

    spajs.addMenu({
        id:getMenuIdFromApiPath(api_path),
        url_parser:path_regexp,
        priority:api_obj.level,
        onOpen:function(holder, menuInfo, data)
        {
            let pageItem = new guiObjectFactory(api_obj)

            var def = new $.Deferred();
            $.when(pageItem.search(data.reg)).done(function()
            {
                def.resolve(pageItem.renderAsPage())
            }).fail(function(err)
            {
                def.resolve(renderErrorAsPage(err));
            })

            return def.promise();
        },
    })
}

tabSignal.connect("resource.loaded", function()
{
    window.api = new guiApi()
    $.when(window.api.init()).done(function()
    {
        // Событие в теле которого можно было бы переопределить ответ от open api
        tabSignal.emit("openapi.loaded",  {api: window.api});

        window.guiSchema = openApi_guiSchema(window.api.openapi)

        tabSignal.emit("openapi.schema",  {api: window.api, schema:window.guiSchema});

        openApi_guiPagesBySchema(window.guiSchema)

        // Событие в теле которого можно было бы переопределить и дополнить список страниц
        tabSignal.emit("openapi.paths",  {api: window.api});



        tabSignal.emit("openapi.completed",  {api: window.api});
        tabSignal.emit("loading.completed");
    })
})
