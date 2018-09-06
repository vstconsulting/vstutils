 
// Если количество не обязательных полей больше или равно чем hide_non_required то они будут спрятаны
// If number of non required field equal or more then `hide_non_required`, then them be hide
guiLocalSettings.setIfNotExists('hide_non_required', 4)
// Количество элементов на странице
// Number of element on page
guiLocalSettings.setIfNotExists('page_size', 20)
 

function getMenuIdFromApiPath(path){
    debugger;
    return path.replace(/[^A-z0-9\-]/img, "_")
}

function openApi_newDefinition(api, name, definitionList, definitionOne)
{
    name = name.toLowerCase().replace(/^One/i, "")
    if(window["api"+name])
    {
        return window["api"+name];
    }
    
    let one = definitionOne;
    let list = definitionList;

    console.log("Фабрика", name.replace(/^One/i, ""));

    if(!one)
    {
        one = list;
    }

    if(!list)
    {
        list = one;
    }

    let list_fileds = []
    for(let i in list.properties)
    {
        if($.inArray(i, ['url', 'id']) != -1)
        {
            continue;
        }

        let val = list.properties[i]
        val.name = i

        val.required = false
        if($.inArray(i, list.required) != -1)
        {
            val.required = true
        }
 
        list_fileds.push(val)
    }

    let one_fileds = []
    for(let i in one.properties)
    {
        if($.inArray(i, ['url', 'id']) != -1)
        {
            continue;
        }

        let val = one.properties[i]
        val.name = i

        val.required = false
        if($.inArray(i, one.required) != -1)
        {
            val.required = true
        }
  
        one_fileds.push(val)
    }

    window["api"+name] = guiItemFactory(api, {
        // both view
        bulk_name:name.toLowerCase().replace(/^One/i, ""), 
    },
    {
        view:{ // list view
            urls:{},
            definition:list,
            class_name:"api"+name,
            page_size:guiLocalSettings.get('page_size'),
            bulk_name:name.toLowerCase().replace(/^One/i, ""),
        },
        model:{
            fileds:list_fileds,
            page_name:name.toLowerCase().replace(/^One/i, ""),
        }
    }, {
        view:{ // one view
            urls:{},
            definition:one,
            class_name:"api"+name,
            hide_non_required:guiLocalSettings.get('hide_non_required'),
            bulk_name:name.toLowerCase().replace(/^One/i, ""),
        },
        model:{
            fileds:one_fileds,
            page_name:name.toLowerCase().replace(/^One/i, ""),
        }
    })

    /**
     *  Событие в теле которого можно было бы переопределить поля фабрики сразу после её создания
     *  Inside this event we can overload factory field immediately after create her
     *  На пример такой код для объекта типа Group будет добавлять поле testData
     *  For example this code for object type Group we add only field testData
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
    // Create factory for all
    for(var key in api.openapi.definitions)
    {

        var one;
        var list;

        if(/^One/.test(key))
        {
            one = api.openapi.definitions[key]
            list = api.openapi.definitions[key.replace(/^One/i, "")]
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
    url = url.replace(/[/#]*$/, "")
    var reg_exp = new RegExp(regexp)
    if(!reg_exp.test(url))
    {
        return false;
    }

    return reg_exp.exec(url)
}

function guiGetTestUrlFunctionfunction(regexp, api_path_value)
{
    return function(url)
    {
        let res = guiTestUrl(regexp, url)
        if(!res)
        {
            return false;
        }

        let obj = res.groups
        obj.page_and_parents = obj.url = res[0]; // page + parents; current url in block
 
        if(obj.page_and_parents)
        {
            let match = obj.page_and_parents.match(/(?<parent_type>[A-z]+)\/(?<parent_id>[0-9]+)\/(?<page_type>[A-z\/]+)$/)

            if(match && match.groups)
            {
                obj.parent_type = match.groups.parent_type
                obj.parent_id = match.groups.parent_id
                obj.page_type = match.groups.page_type.replace(/\/[A-z]+$/, "")
                obj.page_name = match.groups.page_type 
            }
        }

        obj.searchURL = function(query){
            return "/?"+this.page_and_parents+"/search/"+query;
        }

        obj.baseURL = function(){  
            return "/?"+this.page.replace(/\/[^/]+$/, "");
        }

        obj.getApiPath = function (){
            return {api:api_path_value, url:this}
        }
        
        return obj
    }
}

/**
 * По пути в апи определяет ключевое имя для регулярного выражения урла страницы
 * Get key name for regular expression of page url, from api path
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
 * Recursive search schema description in object
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
        let name = obj.match(/\/([A-z0-9]+)$/)
        if(name && name[1])
        {
            let apiname = "api" + name[1].toLowerCase().replace(/^One/i, "")
            let api_obj = window[apiname]
            if(api_obj)
            {
                return api_obj;
            }
        }
        return undefined;
    }

    if(typeof obj == 'object')
    {
        for (let i in obj) {
            if (i == '$ref') {
                let name = obj[i].match(/\/([A-z0-9]+)$/)

                if (name && name[1]) {
                    let apiname = "api" + name[1].toLowerCase().replace(/^One/i, "")
                    let api_obj = window[apiname]
                    if (api_obj) {
                        return api_obj;
                    }
                }
            }

            if (typeof obj[i] == 'object') {
                let api_obj = getObjectBySchema(obj[i])
                if (api_obj) {
                    return api_obj;
                }
            }
        }
    }

    return undefined;
}

/**
 * Вернёт массив вложенных путей для пути base_path
 * Return array of nested path for `base_path`
 * @param {type} api
 * @param {type} `base_path` path in api
 * @returns {Array} `action` of this way
 */
function openApi_get_internal_links(api, base_path, targetLevel)
{ 
    if(!api.openapi["paths"][base_path].get)
    {
        return []
    }

    let res = [];

    // UPDATED NEW Build list of `actions` based on data of one record
    for(let api_action_path in api.openapi.paths)
    {
        let include_base_path = api_action_path.substr(0, base_path.length).includes(base_path)
        let curr_path_level = api_action_path.slice(base_path.length).split('/').length - 1;
        if (include_base_path && curr_path_level == targetLevel)
        {
            let name = api_action_qpath.split('/').slice(-1)[1]
            if (name){
                res[name[1]] = {
                    api_path:api_action_path,
                    name:name[1],
                    api_path_value:api_path_value,
                    isAction:api_path_value.get === undefined || !/_(get|list)$/.test(api_path_value.get.operationId)
                }
            }
        }
    }
    // // NEW Build list of `actions` based on data of one record
    // let base_path_level = base_path.match(/\//g).length;
    // let base_path_for_regexp = base_path.replace(/\//g,'\\/');
    //
    // for(let api_action_path in api.openapi.paths)
    // {
    //     let api_path_value = api.openapi.paths[api_action_path]
    //     let re = new RegExp("^"+base_path_for_regexp);
    //
    //     if (re.exec(api_action_path) && targetLevel == api_action_path.match(/\//g).length - base_path_level)
    //     {
    //         let name = /\/([A-z0-9]+)\/$/.exec(api_action_path);
    //         if (name){
    //             res[name[1]] = {
    //                 api_path:api_action_path,
    //                 name:name[1],
    //                 api_path_value:api_path_value,
    //                 isAction:api_path_value.get === undefined || !/_(get|list)$/.test(api_path_value.get.operationId)
    //             }
    //         }
    //     }
    // }
    //
    // // Build list of `actions` based on data of one record
    // for(let api_action_path in api.openapi.paths)
    // {
    //     let api_path_value = api.openapi.paths[api_action_path]
    //
    //
    //     let count = 0;
    //     let base_url = ""
    //     for(let i=0; i< api_action_path.length && i< base_path.length; i++)
    //     {
    //         if(api_action_path[i] == base_path[i])
    //         {
    //             count++;
    //             base_url+= api_action_path[i]
    //         }
    //         else
    //         {
    //             break;
    //         }
    //     }
    //
    //     if(count <  base_path.length)
    //     {
    //         continue;
    //     } else {
    //         base_url = api_action_path
    //     }
    //
    //     let dif = api_action_path.match(/\//g).length - base_path.match(/\//g).length;
    //     if(dif != targetLevel)
    //     {
    //         continue;
    //     }
    //
    //     let name = api_action_path.match(/\/([A-z0-9]+)\/$/)
    //     if(!name)
    //     {
    //         continue;
    //     }
    //
    //     res[name[1]] = {
    //         api_path:api_action_path,
    //         name:name[1],
    //         api_path_value:api_path_value,
    //         isAction:api_path_value.get === undefined || !/_(get|list)$/.test(api_path_value.get.operationId)
    //     }
    //
    // }

    return res;
}

/**
 * Создаёт страницу экшена
 * Create `action` page
 * @param {Object} api
 * @param {Object} api_path
 * @param {Object} action
 * @returns {undefined}
 */
function openApi_add_one_action_page_path(api, api_path, action)
{
    let api_path_value = api.openapi.paths[api_path]

    // Создали страницу
    // Create page
    let page = new guiPage();

    // Настроили страницу
    // Set up the page
    page.blocks.push({
        id:'actionOne',
        prioritet:10,
        render:function(action, api_path_value)
        {
            return function(menuInfo, data)
            {
                // Создали список хостов
                // Create host list
                let pageAction = new action({api:api_path_value, url:data.reg})

                return pageAction.renderAsPage();
            }
        }(action, api_path_value)
    })

    // Страница элемента вложенного куда угодно
    // Page of element nested to somebody
    let regexp_in_other = guiGetTestUrlFunctionfunction("^(?<parents>[A-z]+\\/[0-9]+\\/)*(?<page>"+getNameForUrlRegExp(api_path.toLowerCase().replace(/\/([A-z0-9]+)\/$/, "/"))+")\\/(?<action>"+action.view.name+")$", api_path_value);

    page.registerURL([regexp_in_other], getMenuIdFromApiPath(api_path));
}

/**
 * Создаёт страницу объекта
 * Create object page
 * @param {Object} api
 * @param {Object} api_path
 * @param {Object} pageMainBlockObject
 * @returns {undefined}
 */
function openApi_add_one_page_path(api, api_path, pageMainBlockObject)
{
    let api_path_value = api.openapi.paths[api_path]

    // Create page
    let page = new guiPage();

    // Set up the page
    page.blocks.push({
        id:'itemOne',
        prioritet:0,
        render:function(pageMainBlockObject, api_path_value)
        {
            return function(menuInfo, data)
            {
                // Create host list
                let pageItem = new pageMainBlockObject.one({api:api_path_value, url:data.reg})

                let def = new $.Deferred();
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

    // Define type of page from url(if they have id in end)
    let page_url_regexp = "^(?<parents>[A-z]+\\/[0-9]+\\/)*(?<page>"+getNameForUrlRegExp(api_path)+")$"

    // Page of element nested to somebody
    let regexp_in_other = guiGetTestUrlFunctionfunction(page_url_regexp, api_path_value);

    page.registerURL([regexp_in_other], getMenuIdFromApiPath(api_path));
}

/**
 * Создаёт страницу списка и страницу с формой создания объекта
 * Create list page and page with create object form
 * @param {Object} api
 * @param {Object} api_path
 * @param {Object} pageMainBlockObject
 * @returns {undefined}
 */
function openApi_add_list_page_path(api, api_path, pageMainBlockObject)
{

    // Create page
    let page = new guiPage();

    let path_regexp = []
    let api_path_value = api.openapi.paths[api_path]

    let pathregexp = "^"
        +"(?<page_and_parents>"
            +"(?<parents>[A-z]+\\/[0-9]+\\/)*"
            +"(?<page>"+getNameForUrlRegExp(api_path)+"))"
        +"(?<search_part>\\/search\\/(?<search_query>[A-z0-9 %\-.:,=]+)){0,1}"
        +"(?<page_part>\\/page\\/(?<page_number>[0-9]+)){0,1}$"

    path_regexp.push(guiGetTestUrlFunctionfunction(pathregexp, api_path_value))


    // Field for search
    api_path_value.parameters

    // Check can we create objects
    if(api_path_value.post)
    {
        // Page of new object must create based on schema of POST request, not based on object list schema
        // parameters[0].schema.$ref
        let pageNewObject = getObjectBySchema(api_path_value.post)
         
        if(!pageNewObject)
        {
            console.error("Not valid schema, @todo")
        }
        else
        {
            // If have `Create` button, then need register create object page
            let new_page_url = guiGetTestUrlFunctionfunction("^(?<parents>[A-z]+\\/[0-9]+\\/)*(?<page>"+getNameForUrlRegExp(api_path)+")\\/new$", api_path_value)

            // Create page
            let page_new = new guiPage();
            page_new.registerURL([new_page_url], getMenuIdFromApiPath(api_path+"_new"));

 
            // Set up of new object page
            page_new.blocks.push({
                id:'newItem',
                prioritet:10,
                render:function(pageNewObject, api_path_value)
                {
                    return function(menuInfo, data)
                    {
                        let def = new $.Deferred();
                       
                        let pageItem = new pageNewObject.one({api:api_path_value, url:data.reg})
                        def.resolve(pageItem.renderAsNewPage())

                        return def.promise();
                    }
                }(pageNewObject, api_path_value)
            })
        }
        
    }

    // Sub items page add
    if(api_path_value.urlLevel > 2 && pageMainBlockObject.list.getShortestApiURL().level == 2)
    {
        // If have button `Create object`, then need register create object page
        let add_page_url = guiGetTestUrlFunctionfunction("^(?<page_and_parents>(?<parents>[A-z]+\\/[0-9]+\\/)*(?<page>"+getNameForUrlRegExp(api_path)+"\\/add))(?<search_part>\\/search\\/(?<search_query>[A-z0-9 %\-.:,=]+)){0,1}(?<page_part>\\/page\\/(?<page_number>[0-9]+)){0,1}$", api_path_value)

        // Create page
        let page_add = new guiPage();
        page_add.registerURL([add_page_url], getMenuIdFromApiPath(api_path+"_add"));

        // Set up page of add existing element
        page_add.blocks.push({
            id:'itemList',
            prioritet:10,
            render:function(pageMainBlockObject, api_path_value)
            {
                return function(menuInfo, data)
                {
                    let def = new $.Deferred();

                    // Create host page
                    let pageItem = new pageMainBlockObject.list({api:api_path_value, url:data.reg, selectionTag:api_path_value.api_path+"add/"})

                    let filter =  $.extend(true, data.reg)

                    filter.parent_type = filter.parent_id = undefined
                    // filter.parent_type = undefined

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

    // Set up the list page
    page.blocks.push({
        id:'itemList',
        prioritet:10,
        render:function(pageMainBlockObject, api_path_value)
        {
            return function(menuInfo, data)
            {
                let def = new $.Deferred();

                // Create host list
                let pageItem = new pageMainBlockObject.list({api:api_path_value, url:data.reg})

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

    page.registerURL(path_regexp, getMenuIdFromApiPath(api_path));
}

/**
 * Return object factory based on api path
 * And add in factory object's information by url
 * @param {Object} api
 * @param {Object} api_path
 * @param {Object} pageMainBlockObject
 * @returns {undefined}
 */
function openApi_getPageMainBlockType(api, api_path, request_type)
{
    let api_path_value = api.openapi.paths[api_path]

    // Determine class by url
    let replaced_api_path = api_path.replace(/\{[A-z]+\}\/$/, "")
    let pageMainBlockType = replaced_api_path.match(/\/([A-z0-9]+)\/$/)

    if(!pageMainBlockType || !pageMainBlockType[1])
    {
        return false;
    }

    let operationId;
    for (let request_type in api_path_value) {
        try {
            if (api_path_value[request_type] && api_path_value[request_type].operationId) {
                operationId = api_path_value[request_type].operationId
                break;
            }
        }
        catch (exception) {
            return false;
        }
    }

    // Get class by name
    // Try via conformity url and class
    let pageMainBlockObject= window["api" + pageMainBlockType[1].toLowerCase().replace(/^One/i, "")]
    if(pageMainBlockObject)
    {
        let new_bulk_name = replaced_api_path.toLowerCase().match(/\/([A-z0-9]+)\/$/);
        if(/_get$/.test(operationId))
        {
            pageMainBlockObject.one.view.urls[api_path] = {name:new_bulk_name[1].replace(/^One/i, ""), level:api_path_value.urlLevel, api:api_path_value, url:undefined}
        }
        if(/_list$/.test(operationId))
        {
            pageMainBlockObject.list.view.urls[api_path] = {name:new_bulk_name[1].replace(/^One/i, ""), level:api_path_value.urlLevel, api:api_path_value, url:undefined}
        }

        return pageMainBlockObject;
    }

    // If failed to determine, try via conformity schema name on the class fields
    let request_type_response;
    if (request_type && api_path_value[request_type].responses[200]){
        request_type_response = api_path_value[request_type].responses[200]
    }
    else if (request_type && api_path_value[request_type].responses[201]){
        request_type_response = api_path_value[request_type].responses[201]
    }
    else {
        return false;
    }

    // Try get class by schema name from url
    try{
        pageMainBlockType = request_type_response.schema.$ref.match(/\/([A-z0-9]+)$/)
    }
    catch (exception)
    {
        try{
            pageMainBlockType = request_type_response.schema.properties.results.items.$ref.match(/\/([A-z0-9]+)$/)
        }
        catch (exception)
        {
            console.warn(api_path+" doesn't have schema.")
            return false;
        }
    }

    if(!pageMainBlockType || !pageMainBlockType[1])
    {
        return false;
    }

    pageMainBlockObject= window["api" + pageMainBlockType[1].toLowerCase().replace(/^One/i, "")]
    if(!pageMainBlockObject)
    { 
        return false;
    }

    // If find conformity by sent data of schema, need set correct `bulk_name`
    let new_bulk_name = replaced_api_path.toLowerCase().match(/\/([A-z0-9]+)\/$/);

    if(pageMainBlockObject.one.getBulkName() == "data")
    {
        console.log("create new bulk_name="+new_bulk_name[1]+" from "+pageMainBlockObject.one.getBulkName())
        pageMainBlockObject = openApi_newDefinition(api, new_bulk_name[1], {}, {})
    }
    else
    {
        console.log("add new bulk_name="+new_bulk_name[1]+" to "+pageMainBlockObject.one.getBulkName())
        window["api" + new_bulk_name[1].toLowerCase().replace(/^One/i, "") ] = pageMainBlockObject
    }

    if(/_get$/.test(operationId))
    {
        pageMainBlockObject.one.view.urls[api_path] = {name:new_bulk_name[1].toLowerCase().replace(/^One/i, ""), level:replaced_api_path.urlLevel, api:api_path_value, url:undefined}
    }
    if(/_list$/.test(operationId))
    {
        pageMainBlockObject.list.view.urls[api_path] = {name:new_bulk_name[1].toLowerCase().replace(/^One/i, ""), level:replaced_api_path.urlLevel, api:api_path_value, url:undefined}
    }

    return pageMainBlockObject;
}


function openApi_paths(api)
{
    //debugger;
    for(let api_path in api.openapi.paths)
    {
        // Add fabric object's objects information by url
        api.openapi.paths[api_path].api_path = api_path
        api.openapi.paths[api_path].urlLevel = (api_path.match(/\//g) || []).length
        openApi_getPageMainBlockType(api, api_path)
    }

    // Build pages of one object and object's actions
    for(let api_path in api.openapi.paths)
    {
        var api_path_value = api.openapi.paths[api_path]

        // Better check pages type by api.openapi["paths"]["/group/"].get.operationId
        // If *_list this list
        // If *_get thi pages
        // In other cases, this is action

        if(!api_path_value.get )
        {
            // This action
            continue;
        }
        
        if(!/_(get)$/.test(api_path_value.get.operationId) )
        {
            // This not single element
            continue;
        }

        // Menu nesting level (if value equal 1 then show menu on left side)
        let pageMainBlockObject = openApi_getPageMainBlockType(api, api_path)
        if(pageMainBlockObject == false)
        {
            continue;
        }

        // this single element
        openApi_add_one_page_path(api, api_path, pageMainBlockObject)
    }


    // Build object's list pages and object's creator form
    for(var api_path in api.openapi.paths)
    {
        if(!/_list$/.test(api_path_value.get.operationId) )
        {
            // this not list
            continue;
        }

        // Menu nesting level (if value equal 1 then show menu on left side)
        //debugger;
        let pageMainBlockObject = openApi_getPageMainBlockType(api, api_path)
        if(pageMainBlockObject == false)
        {
            continue;
        }

        // this is list
        openApi_add_list_page_path(api, api_path, pageMainBlockObject)
    }

    // Build actions pages
    for(var api_path in api.openapi.paths)
    {
        // Better check pages type by api.openapi["paths"]["/group/"].get.operationId
        // If *_list this list
        // If *_get thi pages
        // In other cases, this is action

        if(api_path_value.get )
        {
            if(/_(get|list)$/.test(api_path_value.get.operationId))
            {
                // this is not action
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


/*function openApi_add_page_for_adding_subitems()
{

    var path_regexp = guiGetTestUrlFunctionfunction("^(?<page_and_parents>(?<parents>[A-z]+\\/[0-9]+\\/)*(?<page>))(?<search_part>\\/search\\/(?<search_query>[A-z0-9 %\-.:,=]+)){0,1}(?<page_part>\\/page\\/(?<page_number>[0-9]+)){0,1}$", api_path_value)

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
}*/

tabSignal.connect("resource.loaded", function()
{
    window.api = new guiApi()
    $.when(window.api.init()).done(function(){

        // Событие в теле которого можно было бы переопределить ответ от open api
        // Inside this event we can overload answer from `openapi`
        tabSignal.emit("openapi.loaded",  {api: window.api});

        openApi_definitions(window.api)

        /**
         * Событие в теле которого можно было бы переопределить отдельные методы для классов ап
         * Inside this event we can overload methods for api class
         * tabSignal.connect("openapi.definitions", function()
            {
                // Переопределили метод render у фабрики хостов
                // Overload method `render` of host factory
               window.apiHost.one.render = function(){ alert("?!")}
            })
         */
        tabSignal.emit("openapi.definitions",  {api: window.api});

        openApi_paths(window.api);

        // Событие в теле которого можно было бы переопределить и дополнить список страниц
        // Inside this event we can overload and complete page list
        tabSignal.emit("openapi.paths",  {api: window.api});

        tabSignal.emit("openapi.completed",  {api: window.api});
        tabSignal.emit("loading.completed");
    })
})