
function getMenuIdFromApiPath(path){
    return path.replace(/[^A-z0-9\-]/img, "_")+Math.random()
}


function openApi_newDefinition(api, name, definitionList, definitionOne)
{
    name = name.toLowerCase()
    if(window["api"+name])
    {
        return window["api"+name];
    }

    var one = definitionOne;
    var list = definitionList;

    console.log("Фабрика", name.replace(/^One/, ""));

    if(!one)
    {
        one = list;
    }

    if(!list)
    {
        list = one;
    }

    var list_fileds = []
    for(var i in list.properties)
    {
        if($.inArray(i, ['url', 'id']) != -1)
        {
            continue;
        }

        var val = list.properties[i]
        val.name = i


        list_fileds.push(val)
    }

    var one_fileds = []
    for(var i in one.properties)
    {
        if($.inArray(i, ['url', 'id']) != -1)
        {
            continue;
        }

        var val = one.properties[i]
        val.name = i


        one_fileds.push(val)
    }

    window["api"+name] = guiItemFactory(api, {
        view:{
            bulk_name:name.toLowerCase().replace(/^One/i, ""),
            definition:list,
            class_name:"api"+name,
            page_size:20,
            urls:{},
        },
        model:{
            fileds:list_fileds,
            page_name:name.toLowerCase().replace(/^One/i, ""),
        }
    }, {
        view:{
            bulk_name:name.toLowerCase().replace(/^One/i, ""),
            definition:one,
            class_name:"api"+name,
            urls:{},
        },
        model:{
            fileds:one_fileds,
            page_name:name.toLowerCase().replace(/^One/i, ""),
        }
    })

    /**
     *  Событие в теле которого можно было бы переопределить поля фабрики сразу после её создания
     *
     *  На пример такой код для объекта типа Group будет добавлять поле testData
     *   tabSignal.connect("openapi.factory.Group", function(data)
     *   {
     *      data.testData = "ABC";
     *   })
     */
    tabSignal.emit("openapi.factory."+name,  {obj:window["api"+name], name:"api"+name});
    return window["api"+name]
}

function openApi_definitions(api)
{
    // Создали фабрику для всего
    for(var key in api.openapi.definitions)
    {

        var one;
        var list;

        if(/^One/.test(key))
        {
            one = api.openapi.definitions[key]
            list = api.openapi.definitions[key.replace(/^One/, "")]
        }
        else
        {
            one = api.openapi.definitions["One"+key]
            list = api.openapi.definitions[key]
        }

        openApi_newDefinition(api, key, list, one)
    }
}

function getUrlInf(url_reg){
    if(!url_reg)
    {
        url_reg = spajs.urlInfo.data.reg
    }

            // Поиск и списки:
            // При таком построении регулярок:
            //  - параметры поиска в блоке 4
            //  - тип страницы в блоке 3
            //  - цепочка родителей в блоке 2
            //  - страница+родители в блоке 1
            //  - текущий урл в блоке 0

    return {
        url:url_reg[0],
        search:url_reg[4],
        page_type:url_reg[3],
        page_and_parents:url_reg[1],
    }
}

function guiTestUrl(regexp, url)
{
    var reg_exp = new RegExp(regexp)
    if(!reg_exp.test(url))
    {
        return false;
    }

    return reg_exp.exec(url)
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
 * Ищет описание схемы в объекте рекурсивно
 * @param {object} obj
 * @returns {undefined|object}
 */
function getObjectBySchema(obj)
{
    if(!obj)
    {
        return undefined;
    }

    if(typeof obj == 'string')
    {
        var name = obj.match(/\/([A-z0-9]+)$/)
        if(name && name[1])
        {
            name = window["api" + name[1].toLowerCase() ]
            if(name)
            {
                return name;
            }
        }
        return undefined;
    }

    if(typeof obj != 'object')
    {
        return undefined;
    }

    for(var i in obj)
    {
        if(i == '$ref')
        {
            var name = obj[i].match(/\/([A-z0-9]+)$/)

            if(name && name[1])
            {
                name = window["api" + name[1].toLowerCase() ]
                if(name)
                {
                    return name;
                }
            }
        }

        if(typeof obj[i] == 'object')
        {
            name = getObjectBySchema(obj[i])
            if(name)
            {
                return name;
            }
        }
    }

    return undefined;
}

/**
 * Вернёт массив вложенных путей для пути base_path
 * @param {type} api апи
 * @param {type} base_path путь в апи
 * @returns {Array} экшены этого пути
 */
function openApi_get_internal_links(api, base_path, targetLevel)
{
    if(!api.openapi["paths"][base_path].get)
    {
        return []
    }

    var res = []
    // Список Actions строить будем на основе данных об одной записи.
    for(var api_action_path in api.openapi.paths)
    {
        var api_path_value = api.openapi.paths[api_action_path]


        var count = 0;
        var base_url = ""
        for(var i=0; i< api_action_path.length && i< base_path.length; i++)
        {
            if(api_action_path[i] == base_path[i])
            {
                count++;
                base_url+= api_action_path[i]
            }
            else
            {
                break;
            }
        }

        if(count <  base_path.length)
        {
            continue;
        }

        let dif = api_action_path.match(/\//g).length - base_path.match(/\//g).length;
        if(dif != targetLevel)
        {
            continue;
        }

        var name = api_action_path.match(/\/([A-z0-9]+)\/$/)
        if(!name)
        {
            //debugger;
            continue;
        }

        res[name[1]] = {
            api_path:api_action_path,
            name:name[1],
            api_path_value:api_path_value,
            isAction:api_path_value.get === undefined || !/_(get|list)$/.test(api_path_value.get.operationId)
        }

    }

    return res;
}

/**
 * Создаёт страницу экшена
 * @param {Object} api
 * @param {Object} api_path
 * @param {Object} action
 * @returns {undefined}
 */
function openApi_add_one_action_page_path(api, api_path, action)
{
    // Создали страницу
    var page = new guiPage();

    // Настроили страницу
    page.blocks.push({
        id:'actionOne',
        prioritet:10,
        render:function(action)
        {
            return function(menuInfo, data)
            {
                // Создали список хостов
                var pageAction = new action(data.reg)

                return pageAction.renderAsPage();
            }
        }(action)
    })

    // Страница элемента вложенного куда угодно
    var regexp_in_other = function(regexp)
            {
                console.log(regexp)
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
                        var match = obj.page_and_parents.match(/(?<parent_type>[A-z]+)\/(?<parent_id>[0-9]+)\/(?<page_type>[A-z]+)$/)

                        if(match && match.groups)
                        {
                            obj.parent_type = match.groups.parent_type
                            obj.parent_id = match.groups.parent_id
                            obj.page_type = match.groups.page_type
                        }
                    }

                    obj.baseURL = function(){
                        if(this.parents)
                        {
                            return "/?"+this.parents;
                        }

                        return "/?"+this.page_type;
                    }
 
                    return obj
                }
            }("^(?<parents>[A-z]+\\/[0-9]+\\/)*(?<page>"+getNameForUrlRegExp(api_path.toLowerCase().replace(/\/([A-z0-9]+)\/$/, "/"))+")\\/(?<action>"+action.view.name+")$");

    page.registerURL([regexp_in_other], getMenuIdFromApiPath(api_path));
}

/**
 * Создаёт страницу объекта
 * @param {Object} api
 * @param {Object} api_path
 * @param {Object} pageMainBlockObject
 * @param {Number} urlLevel
 * @returns {undefined}
 */
function openApi_add_one_page_path(api, api_path, pageMainBlockObject, urlLevel)
{
    var api_path_value = api.openapi.paths[api_path]
    api_path_value.api_path = api_path

    // Создали страницу
    var page = new guiPage();

    // Настроили страницу
    page.blocks.push({
        id:'itemOne',
        prioritet:0,
        render:function(pageMainBlockObject, api_path_value)
        {
            return function(menuInfo, data)
            {
                // Создали список хостов
                var pageItem = new pageMainBlockObject.one({api:api_path_value, url:data.reg})

                var def = new $.Deferred();
                $.when(pageItem.load(data.reg)).done(function()
                {
                    def.resolve(pageItem.renderAsPage())
                }).fail(function(err)
                {
                    def.resolve(renderErrorAsPage(err));
                })

                return def.promise();
            }
        }(pageMainBlockObject, api_path_value)
    })

    // Определяем тип страницы из урла (есть у него id в конце или нет)
    var page_url_regexp = "^(?<parents>[A-z]+\\/[0-9]+\\/)*(?<page>"+getNameForUrlRegExp(api_path)+")$"

    // Страница элемента вложенного куда угодно
    var regexp_in_other = function(regexp)
            {
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
                        var match = obj.page_and_parents.match(/(?<parent_type>[A-z]+)\/(?<parent_id>[0-9]+)\/(?<page_type>[A-z]+)$/)

                        if(match && match.groups)
                        {
                            obj.parent_type = match.groups.parent_type
                            obj.parent_id = match.groups.parent_id
                            obj.page_type = match.groups.page_type
                        }
                    }
                    /*
                    if(obj.parents)
                    {
                        var match = obj.parents.match(/([A-z]+)\/([0-9]+)\/$/)

                        if(match && match[1] && match[2] && match[2])
                        {
                            obj.parent_type = match[1]
                            obj.parent_id = match[2]
                        }
                    }*/

                    obj.baseURL = function(){
                        if(this.parents)
                        {
                            return "/?"+this.parents;
                        }

                        return "/?"+this.page_and_parents;
                    }
 
                    return obj
                }
            }(page_url_regexp);

    page.registerURL([regexp_in_other], getMenuIdFromApiPath(api_path));
}

/**
 * Создаёт страницу списка и страницу с формой создания объекта
 * @param {Object} api
 * @param {Object} api_path
 * @param {Object} pageMainBlockObject
 * @param {Number} urlLevel
 * @returns {undefined}
 */
function openApi_add_list_page_path(api, api_path, pageMainBlockObject, urlLevel)
{

    // Создали страницу
    var page = new guiPage();

    var path_regexp = []
    var api_path_value = api.openapi.paths[api_path]
    api_path_value.api_path = api_path

    path_regexp.push(function(regexp)
            {
                return function(url)
                {
                    var res = guiTestUrl(regexp, url)
                    if(!res)
                    {
                        return false;
                    }

                    var obj = res.groups

                    obj.url = res[0]                 // текущий урл в блоке 
 
                    if(obj.page_and_parents)
                    {
                        var match = obj.page_and_parents.match(/(?<parent_type>[A-z]+)\/(?<parent_id>[0-9]+)\/(?<page_type>[A-z]+)$/)

                        if(match && match.groups)
                        {
                            obj.parent_type = match.groups.parent_type
                            obj.parent_id = match.groups.parent_id
                            obj.page_type = match.groups.page_type
                        }
                    }

                    obj.searchURL = function(query){
                        return "/?"+this.page_and_parents+"/search/"+query;
                    }

                    obj.baseURL = function(){
                        return "/?"+this.page_and_parents;
                    }
 
                    return obj
                }
            }("^(?<page_and_parents>(?<parents>[A-z]+\\/[0-9]+\\/)*(?<page>"+getNameForUrlRegExp(api_path)+"))(?<search_part>\\/search\\/(?<search_query>[A-z0-9 %\-.:,=]+)){0,1}(?<page_part>\\/page\\/(?<page_number>[0-9]+)){0,1}$"))


    // Поля для поиска
    api_path_value.parameters

    // Проверяем есть ли возможность создавать объекты
    if(api_path_value.post)
    {
        // Страница нового объекта создаваться должна на основе схемы пост запроса а не на основе схемы списка объектов.
        // parameters[0].schema.$ref
        var pageNewObject = getObjectBySchema(api_path_value.post)
        if(!pageNewObject)
        {
            debugger;
            console.error("Not valid schema, @todo")
        }

        // Значит добавим кнsопку создать объект
        page.blocks.push({
            id:'btn-create',
            prioritet:9,
            render:function(pageMainBlockObject)
            {
                return function(menuInfo, data)
                {
                    var link = window.hostname+"?"+data.reg.page_and_parents+"/new";

                    var btn = new guiElements.link_button({
                        class:'btn btn-primary',
                        link: link,
                        title:'Create new '+pageMainBlockObject.one.view.bulk_name,
                        text:'Create',
                    })

                    var def = new $.Deferred();
                    def.resolve(btn.render())
                    return def.promise();
                }
            }(pageMainBlockObject)
        })

        // Если есть кнопка создать объект то надо зарегистрировать страницу создания объекта
        var new_page_url = function(regexp)
            {
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
                        var match = obj.page_and_parents.match(/(?<parent_type>[A-z]+)\/(?<parent_id>[0-9]+)\/(?<page_type>[A-z]+)$/)

                        if(match && match.groups)
                        {
                            obj.parent_type = match.groups.parent_type
                            obj.parent_id = match.groups.parent_id
                            obj.page_type = match.groups.page_type
                        }
                    }

                    obj.baseURL = function(id){
 
                        var url = "/?"+this.page_and_parents.replace(/\/[^/]+$/, "")
                        
                        if(id)
                        {
                            url+= '/'+id
                        }

                        return url;
                    }

                    return obj
                }
            }("^(?<parents>[A-z]+\\/[0-9]+\\/)*(?<page>"+getNameForUrlRegExp(api_path)+")\\/new$")

        // Создали страницу
        var page_new = new guiPage();
        page_new.registerURL([new_page_url], getMenuIdFromApiPath(api_path+"_new"));


        //    debugger;

        // Настроили страницу нового элемента
        page_new.blocks.push({
            id:'newItem',
            prioritet:10,
            render:function(pageNewObject, api_path_value)
            {
                return function(menuInfo, data)
                {
                    var def = new $.Deferred();

                    var pageItem = new pageNewObject.one({api:api_path_value, url:data.reg})
                    def.resolve(pageItem.renderAsNewPage())

                    return def.promise();
                }
            }(pageNewObject, api_path_value)
        })
    }

    // Страница добавления под элементов
    if(urlLevel > 2 && pageMainBlockObject.list.getShortestApiURL().level == 2)
    {
        // Страница нового объекта создаваться должна на основе схемы пост запроса а не на основе схемы списка объектов.
        // parameters[0].schema.$ref

        // Значит добавим кнsопку создать объект
        page.blocks.push({
            id:'btn-add',
            prioritet:10,
            render:function(pageMainBlockObject)
            {
                return function(menuInfo, data)
                {
                    var link = window.hostname+"?"+data.reg.page_and_parents+"/add";

                    var btn = new guiElements.link_button({
                        class:'btn btn-primary',
                        link: link,
                        title:'Add '+pageMainBlockObject.one.view.bulk_name,
                        text:'Add '+pageMainBlockObject.one.view.bulk_name,
                    })

                    var def = new $.Deferred();
                    def.resolve(btn.render())
                    return def.promise();
                }
            }(pageMainBlockObject)
        })

        // Если есть кнопка создать объект то надо зарегистрировать страницу создания объекта
        var add_page_url = function(regexp)
            {
                return function(url)
                {
                    var res = guiTestUrl(regexp, url)
                    if(!res)
                    {
                        return false;
                    }
                    
                    var obj = res.groups
                    obj.url = res[0]                 // текущий урл в блоке
                    
                    if(obj.page_and_parents)
                    {
                        var match = obj.page_and_parents.match(/(?<parent_type>[A-z]+)\/(?<parent_id>[0-9]+)\/(?<page_type>[A-z]+)\/add$/)

                        if(match && match.groups)
                        {
                            obj.parent_type = match.groups.parent_type
                            obj.parent_id = match.groups.parent_id
                            obj.page_type = match.groups.page_type
                        }
                    }
 
                    obj.baseURL = function(id){ 
                        return "/?"+this.page_and_parents.replace(/\/[^/]+$/, "")
                    }
                     
                    return obj
                }
            }("^(?<page_and_parents>(?<parents>[A-z]+\\/[0-9]+\\/)*(?<page>"+getNameForUrlRegExp(api_path)+"\\/add))(?<search_part>\\/search\\/(?<search_query>[A-z0-9 %\-.:,=]+)){0,1}(?<page_part>\\/page\\/(?<page_number>[0-9]+)){0,1}$")

        // Создали страницу
        var page_add = new guiPage();
        page_add.registerURL([add_page_url], getMenuIdFromApiPath(api_path+"_add"));

        // Настроили страницу добавления существующего элемента
        page_add.blocks.push({
            id:'itemList',
            prioritet:10,
            render:function(pageMainBlockObject, api_path_value)
            {
                return function(menuInfo, data)
                {
                    var def = new $.Deferred();

                    // Создали список хостов
                    var pageItem = new pageMainBlockObject.list({api:api_path_value, url:data.reg, selectionTag:api_path_value.api_path+"add/"})

                    var filter =  $.extend(true, data.reg) 
                    
                    filter.parent_id = undefined
                    filter.parent_type = undefined

                    $.when(pageItem.search(filter)).done(function()
                    {
                        def.resolve(pageItem.renderAsAddSubItemsPage())
                    }).fail(function(err)
                    {
                        def.reject(err);
                    })

                    return def.promise();
                }
            }(pageMainBlockObject, api_path_value)
        }) 
    }

    // Настроили страницу списка
    page.blocks.push({
        id:'itemList',
        prioritet:10,
        render:function(pageMainBlockObject, api_path_value)
        {
            return function(menuInfo, data)
            {
                var def = new $.Deferred();

                // Создали список хостов
                var pageItem = new pageMainBlockObject.list({api:api_path_value, url:data.reg})

                //debugger;
                $.when(pageItem.search(data.reg)).done(function()
                {
                    def.resolve(pageItem.renderAsPage())
                }).fail(function(err)
                {
                    def.reject(err);
                })

                return def.promise();
            }
        }(pageMainBlockObject, api_path_value)
    })

    //debugger;
    //break;
    page.registerURL(path_regexp, getMenuIdFromApiPath(api_path));
}

/**
 * Вернёт фабрику объектов на основе пути в апи
 * А ещё добавит в объект фабрики информацию по её урлам
 * @param {Object} api
 * @param {Object} api_path
 * @param {Object} pageMainBlockObject
 * @param {Number} urlLevel
 * @returns {undefined}
 */
function openApi_getPageMainBlockType(api, api_path, urlLevel)
{
    var api_path_value = api.openapi.paths[api_path]

    // Определяем какой класс соответсвует урлу
    var pageMainBlockType = api_path.replace(/\{[A-z]+\}\/$/, "").match(/\/([A-z0-9]+)\/$/)

    if(!pageMainBlockType || !pageMainBlockType[1])
    {
        debugger;
        return false;
    }

    var operationId = undefined
    if(!operationId && api_path_value.get && api_path_value.get.operationId)
    {
        operationId = api_path_value.get.operationId
    }
    if(!operationId && api_path_value.post && api_path_value.post.operationId)
    {
        operationId = api_path_value.post.operationId
    }
    if(!operationId && api_path_value.put && api_path_value.put.operationId)
    {
        operationId = api_path_value.put.operationId
    }
    if(!operationId && api_path_value.delete && api_path_value.delete.operationId)
    {
        operationId = api_path_value.delete.operationId
    }

    // Получаем класс по имени
    // Сначала путём определения соответсвия имён урла и класса
    var pageMainBlockObject= window["api" + pageMainBlockType[1].toLowerCase()]
    if(pageMainBlockObject)
    {
        var new_bulk_name = api_path.replace(/\{[A-z]+\}\/$/, "").toLowerCase().match(/\/([A-z0-9]+)\/$/);
        if(/_get$/.test(operationId))
        {
            pageMainBlockObject.one.view.urls[api_path] = {name:new_bulk_name[1], level:urlLevel, api:api_path_value, url:undefined}
        }
        if(/_list$/.test(operationId))
        {
            pageMainBlockObject.list.view.urls[api_path] = {name:new_bulk_name[1], level:urlLevel, api:api_path_value, url:undefined}
        }

        return pageMainBlockObject;
    }

    // Если не нашли на прямую то через соответсвие имени схемы в полях класса
    try{
        // Получаем класс по имени схемы из урла
        pageMainBlockType = api_path_value.get.responses[200].schema.$ref.match(/\/([A-z0-9]+)$/)
    }
    catch (exception)
    {
        try{
            // Получаем класс по имени схемы из урла
            pageMainBlockType = api_path_value.get.responses[200].schema.properties.results.items.$ref.match(/\/([A-z0-9]+)$/)
        }
        catch (exception)
        {
            try
            {
                // Получаем класс по имени схемы из урла
                pageMainBlockType = api_path_value.post.responses[201].schema.$ref.match(/\/([A-z0-9]+)$/)
            }
            catch (exception)
            {
                try
                {
                    // Получаем класс по имени схемы из урла
                    pageMainBlockType = api_path_value.put.responses[201].schema.$ref.match(/\/([A-z0-9]+)$/)
                }
                catch (exception)
                {
                    console.warn("Нет схемы у "+api_path)
                    //debugger;
                    return false;
                }
            }
        }
    }

    if(!pageMainBlockType || !pageMainBlockType[1])
    {
        debugger;
        return false;
    }

    pageMainBlockObject= window["api" + pageMainBlockType[1].toLowerCase() ]
    if(!pageMainBlockObject)
    {
        // Получаем класс по имени
        pageMainBlockObject= window["api" + pageMainBlockType[1].replace(/^One/, "").toLowerCase() ]
        if(!pageMainBlockObject)
        {
            debugger;
            return false;
        }
    }

    // Если нашли соответсвие по схеме отправляемых данных то выставим правильный bulk_name
    var new_bulk_name = api_path.replace(/\{[A-z]+\}\/$/, "").toLowerCase().match(/\/([A-z0-9]+)\/$/);

    if(pageMainBlockObject.one.view.bulk_name == "data")
    {
        console.log("create new bulk_name="+new_bulk_name[1]+" from "+pageMainBlockObject.one.view.bulk_name)
        pageMainBlockObject = openApi_newDefinition(api, new_bulk_name[1], {}, {})
    }
    else
    {
        console.log("add new bulk_name="+new_bulk_name[1]+" to "+pageMainBlockObject.one.view.bulk_name)
        window["api" + new_bulk_name[1] ] = pageMainBlockObject
    }

    if(/_get$/.test(operationId))
    {
        pageMainBlockObject.one.view.urls[api_path] = {name:new_bulk_name[1], level:urlLevel, api:api_path_value, url:undefined}
    }
    if(/_list$/.test(operationId))
    {
        pageMainBlockObject.list.view.urls[api_path] = {name:new_bulk_name[1], level:urlLevel, api:api_path_value, url:undefined}
    }

    return pageMainBlockObject;
}

function openApi_paths(api)
{
    for(var api_path in api.openapi.paths)
    {
        // Добавит в объект фабрики объектов информацию по её урлам

        // Уровень вложености меню
        var urlLevel = (api_path.match(/\//g) || []).length
        openApi_getPageMainBlockType(api, api_path, urlLevel)
    }

    // Строим страницы одного объекта и экшены объекта
    for(var api_path in api.openapi.paths)
    {
        var api_path_value = api.openapi.paths[api_path]

        // Лучше проверять тип страницы по api.openapi["paths"]["/group/"].get.operationId
        // Если *_list это список
        // Если *_get это страница
        // В остальных случаях экшен

        if(!api_path_value.get )
        {
            // это экшен
            continue;
        }

        if(!/_get$/.test(api_path_value.get.operationId) )
        {
            // это не один элемент
            continue;
        }

        // Уровень вложености меню (по идее там где 1 покажем в меню с лева)
        var urlLevel = (api_path.match(/\//g) || []).length

        var pageMainBlockObject = openApi_getPageMainBlockType(api, api_path, urlLevel)
        if(pageMainBlockObject == false)
        {
            continue;
        }

        // это один элемент
        openApi_add_one_page_path(api, api_path, pageMainBlockObject, urlLevel)
    }


    // Строим страницы списка объектов и формы создания объектов
    for(var api_path in api.openapi.paths)
    {
        var api_path_value = api.openapi.paths[api_path]

        // Лучше проверять тип страницы по api.openapi["paths"]["/group/"].get.operationId
        // Если *_list это список
        // Если *_get это страница
        // В остальных случаях экшен

        if(!api_path_value.get )
        {
            // это экшен
            continue;
        }

        if(!/_list$/.test(api_path_value.get.operationId) )
        {
            // это не список
            continue;
        }


        // Уровень вложености меню (по идее там где 1 покажем в меню с лева)
        var urlLevel = (api_path.match(/\//g) || []).length

        var pageMainBlockObject = openApi_getPageMainBlockType(api, api_path, urlLevel)
        if(pageMainBlockObject == false)
        {
            continue;
        }

        // это список
        openApi_add_list_page_path(api, api_path, pageMainBlockObject, urlLevel)
    }

    // Строим страницы экшенов
    for(var api_path in api.openapi.paths)
    {
        var api_path_value = api.openapi.paths[api_path]

        // Лучше проверять тип страницы по api.openapi["paths"]["/group/"].get.operationId
        // Если *_list это список
        // Если *_get это страница
        // В остальных случаях экшен

        if(api_path_value.get )
        {
            if(/_(get|list)$/.test(api_path_value.get.operationId))
            {
                // это не экшен
                continue;
            }
        }

        var name = api_path.toLowerCase().match(/\/([A-z0-9]+)\/$/);
        if(!name)
        {
            continue;
        }

        var action = guiActionFactory(api, {action:api_path_value, api_path:api_path, name:name[1]})
        openApi_add_one_action_page_path(api, api_path, action)
    }
}


function openApi_add_page_for_adding_subitems()
{

    var path_regexp = function(regexp)
        {
            return function(url)
            {
                var res = guiTestUrl(regexp, url)
                if(!res)
                {
                    return false;
                }

                var obj = res.groups

                obj.url = res[0]                 // текущий урл в блоке
                obj.page_type = res[2]           // тип страницы в блоке

                if(res[1])
                {
                    var match = res[1].match(/([A-z]+)\/([0-9]+)\/([A-z]+)$/)

                    if(match && match[1] && match[2] && match[2])
                    {
                        obj.parent_type = match[1]
                        obj.parent_id = match[2]
                    }
                }

                obj.searchURL = function(query){
                    return "/?"+this.page_and_parents+"/search/"+query;
                }

                obj.baseURL = function(){
                    return "/?"+this.page_and_parents;
                }

                  
                return obj
            }
        }("^(?<page_and_parents>(?<parents>[A-z]+\\/[0-9]+\\/)*(?<page>))(?<search_part>\\/search\\/(?<search_query>[A-z0-9 %\-.:,=]+)){0,1}(?<page_part>\\/page\\/(?<page_number>[0-9]+)){0,1}$")

    // Настроили страницу списка
    page.blocks.push({
        id:'itemList',
        prioritet:10,
        render:function(pageMainBlockObject, api_path_value)
        {
            return function(menuInfo, data)
            {
                var def = new $.Deferred();

                // Создали список хостов
                var pageItem = new pageMainBlockObject.list({api:api_path_value, url:data.reg})

                //debugger;
                $.when(pageItem.search(data.reg)).done(function()
                {
                    def.resolve(pageItem.renderAsPage())
                }).fail(function(err)
                {
                    def.reject(err);
                })

                return def.promise();
            }
        }(pageMainBlockObject, api_path_value)
    })

    //debugger;
    //break;
    page.registerURL(path_regexp, getMenuIdFromApiPath(api_path));
}

tabSignal.connect("resource.loaded", function()
{
    window.api = new guiApi()
    $.when(window.api.init()).done(function(){

        // Событие в теле которого можно было бы переопределить ответ от open api
        tabSignal.emit("openapi.loaded",  {api: window.api});

        openApi_definitions(window.api)

        /**
         * Событие в теле которого можно было бы переопределить отдельные методы для классов апи
         * tabSignal.connect("openapi.definitions", function()
            {
                // Переопределили метод render у фабрики хостов
               window.apiHost.one.render = function(){ alert("?!")}
            })
         */
        tabSignal.emit("openapi.definitions",  {api: window.api});

        openApi_paths(window.api);

        // Событие в теле которого можно было бы переопределить и дополнить список страниц
        tabSignal.emit("openapi.paths",  {api: window.api});

        tabSignal.emit("openapi.completed",  {api: window.api});
        tabSignal.emit("loading.completed");
    })
})