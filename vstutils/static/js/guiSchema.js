// Replace link to `Definitions` to object in field list
// Заменит ссылки на Definitions на объекты в списке полей
function openApi_guiPrepareFields(api, properties, parent_name)
{
    if(!guiElements)
    {
        throw "Error not found window.guiElements"
    }

    let fields = mergeDeep({}, properties)
    for(let i in fields)
    {
        /*if(fields[i].additionalProperties && fields[i].additionalProperties.model && fields[i].additionalProperties.model.$ref)
        {
            // Это для автокомплита поле а не ссылка куда попало.
            continue;
        }*/
        let field = fields[i]

        if(!field.gui_links)
        {
            field.gui_links = []
        }

        if(!field.definition)
        {
            field.definition = {}
        }

        field.name = i
        
        let def_name = getObjectNameBySchema(field, 1)
        if(def_name)
        {
            let def_obj = getObjectDefinitionByName(api, def_name, parent_name+"_"+i)
            if(!def_obj)
            {
                console.error("can not found definition for object "+def_name)
                continue;
            }
            
            field =  mergeDeep(field, def_obj);

            if(!field.gui_links)
            {
                field.gui_links = []
            }

            field.readOnly = true

            let format = def_name.replace("#/", "").split(/\//)

            if(format[1] != "Data")
            {
                field.format = "api"+format[1]
            }

            if(!window.guiElements[field.format])
            {
                // Если нет объекта window.guiElements[field.format] то заменим на базолвый apiObject
                field.format = "apiObject"
            }

            field.definition_ref = def_name
            //field.definition_list = openApi_findParentByDefinition(def_obj, def_name, 'list')
            //field.definition_one = openApi_findParentByDefinition(def_obj, def_name, 'page')

            field.gui_links.push({
                prop_name:'definition',
                list_name:'list',
                type:'list',
                $ref:def_name
            })

            field.gui_links.push({
                prop_name:'definition',
                list_name:'page',
                type:'page',
                $ref:def_name
            })
        }

        let fieldObj;
        if(field.format && window.guiElements[field.format])
        {
            fieldObj = new window.guiElements[field.format](field)
        }
        else if(field.type && window.guiElements[field.type])
        {
            fieldObj = new window.guiElements[field.type](field)
        }

        if(fieldObj && fieldObj.prepareProperties)
        {
            field = fieldObj.prepareProperties(field)
        }

        fields[i] = field
    }

   return fields
}
 
function openApi_findParentByDefinition(api_obj, definition, type = 'list')
{
    if(api_obj.type == type && type == 'list' && api_obj.api.get)
    {
        let schema = getObjectNameBySchema(api_obj.api.get)
        if(schema == definition)
        {
            return api_obj;
        }
    }

    if(api_obj.type == type && type == 'page' && api_obj.page && api_obj.page.api.get)
    {
        let schema = getObjectNameBySchema(api_obj.page.api.get)
        if(schema == definition)
        {
            return api_obj;
        }
    }


    if(api_obj.parent)
    {
        return openApi_findParentByDefinition(api_obj.parent, definition);
    }


    return false
}


/**
 * Replace link from `additionalProperties` to api link for autocomplete work
 * Заменит ссылки из additionalProperties на ссылки в апи для работы автокомплитов
 * @param {type} path_schema
 * @param {type} api_obj
 * @param {type} fields
 *
 * Найдёт в списке полей такое поле
 * field.gui_links = [{
                prop_name:'autocomplete_properties',
                list_name:'list_obj',
                $ref:value.additionalProperties.model.$ref
 * }]
 * И положит в объект  autocomplete_properties.list_obj близжайший урл с моделью $ref
 */
function openApi_guiPrepareAdditionalProperties(path_schema, api_obj, fields)
{
    for(let i in fields)
    {
        if(!fields[i].gui_links)
        {
            continue;
        }

        for(let l in fields[i].gui_links)
        {
            let field = fields[i]
            let link_type = field.gui_links[l]

            let definition = link_type.$ref

            if(!api_obj.parent)
            {
                continue;
            }
       
            if(field[link_type.prop_name] === undefined)
            {
                field[link_type.prop_name] = {}
            }
            
            field[link_type.prop_name][link_type.list_name] = undefined
 
            let list_obj = undefined
            for(let l in api_obj.parent.sublinks)
            {
                list_obj = openApi_findParentByDefinition(api_obj.parent.sublinks[l], definition, link_type.type)
                if(list_obj)
                { 
                    break;
                }
            }

            if(!list_obj)
            {
                for(let p in path_schema)
                {
                    if(path_schema[p].level > 2 || !path_schema[p].api.get)
                    {
                        continue;
                    }
                    
                    let schema = getObjectNameBySchema(path_schema[p].api.get)
                    if(schema != definition)
                    {
                        continue;
                    } 
                    
                    list_obj = path_schema[p]
                    break;
                } 
            }
          
            if(list_obj)
            {  
                if(link_type.type == 'page' && list_obj.type == 'list' && list_obj.page)
                {
                    list_obj = list_obj.page
                }

                if(link_type.type == 'list' && list_obj.type == 'page' && list_obj.list)
                {
                    list_obj = list_obj.list
                }
                
                field[link_type.prop_name][link_type.list_name] = list_obj
                continue;
            }

            let definition_obj = openApi_findParentByDefinition(api_obj, definition, link_type.type)
            if(!definition_obj)
            {
                for(let j in path_schema)
                {
                    let val = path_schema[j]
                    if(val.level > 2)
                    {
                        continue;
                    }

                    let list_obj = openApi_findParentByDefinition(val, definition, link_type.type);
                    if(list_obj)
                    {
                        field[link_type.prop_name][link_type.list_name] = list_obj
                        break;
                    }
                }
            }
        }
    }

   return fields
}
  
// Replace `Definitions` link to field list from `Definitions`
// Заменит ссылки на Definitions на списки полей из Definitions
function openApi_guiQuerySchema(api, QuerySchema, type, parent_name)
{
    if(!QuerySchema)
    {
        return undefined
    }

    let def_name = undefined
    let query_schema = mergeDeep({}, QuerySchema)
    if(type == 'get')
    {
        if(query_schema.parameters)
        {
            query_schema.filters = query_schema.parameters
        }

        def_name = getObjectNameBySchema(query_schema)
    }
    else
    {
        if(query_schema.parameters)
        {
            query_schema.fields = query_schema.parameters
        }

        def_name = getObjectNameBySchema(query_schema.fields)
    }

    delete query_schema.parameters;
    if(!def_name)
    {
        return query_schema;
    }

    let def_obj = getObjectDefinitionByName(api, def_name)
    if(!def_obj)
    {
        return query_schema;
    }

    query_schema.fields = openApi_guiPrepareFields(api, def_obj.properties, parent_name)

    for(let i in query_schema.fields)
    {
        query_schema.fields[i].name = i
    }

    let responses = {}

    for(let i in query_schema.responses)
    {
        let resp = query_schema.responses[i]

        responses[i] = {
            description:resp.description
        }

        let responses_def_name = getObjectNameBySchema(resp)

        if(!responses_def_name)
        {
            continue;
        }

        let responses_def_obj = getObjectDefinitionByName(api, responses_def_name)
        if(!responses_def_obj)
        {
            throw "Not found Definition for name="+responses_def_name
        }

        responses[i].schema = responses_def_obj
    }
    query_schema.responses = responses
 
    return query_schema;
}

function openApi_guiSchemaSetRequiredFlags(api)
{
    for(let i in api.definitions)
    {
        let definition = api.definitions[i]
        if(definition.required)
        {
            for(let j in definition.required)
            {
                definition.properties[definition.required[j]].required = true
            }
        }
    }

    return api
}

// Generate schema based on api
// Сгенерирует схему на основе апи
function openApi_guiSchema(api)
{
    let path_schema = {}
    let short_schema = {}

    api = openApi_guiSchemaSetRequiredFlags(api)

    // Set page type ('page', 'list' or 'action'
    // Проставит типы страниц ('page' или 'list'  или 'action')
    for(let i in api.paths)
    {
        let val = api.paths[i]

        let urlLevel = (i.match(/\//g) || []).length

        let type = undefined
        if(val.get )
        {
            // @todo перезавязаться с operationId на тип ответа в схеме get запроса
            // rebind from `operationId` to `answer type` in schema of `get` request answer
            if(/_(get)$/.test(val.get.operationId))
            {
                type = 'page'
            }
            else if(/_list$/.test(val.get.operationId) )
            {
                type = 'list'
            }
            else
            {
                type = 'action'
            }
        }
        else
        {
            type = 'action'
        }

        let name = i.replace(/\/{[A-z]+}/g, "").split(/\//g)
        name = name[name.length - 2]

        path_schema[i] = {
            level:urlLevel,     // Уровень вложености
            path:i,             // Путь в апи
            type:type,          // Тип объекта ( list | page | action )
            name:name,          // Текст между последним и предпоследним знаком /
            bulk_name:name,     // Имя сущьности
            name_field:'name',  // Поле содержащие имя объекта
            api:{
                get:    openApi_guiQuerySchema(api, val.get, 'get', name),
                patch:  openApi_guiQuerySchema(api, val.patch, 'patch', name),
                put:    openApi_guiQuerySchema(api, val.put, 'put', name),
                post:   openApi_guiQuerySchema(api, val.post, 'post', name),
                delete: openApi_guiQuerySchema(api, val.delete, 'delete', name),
            },
            buttons:[],             // button array; массив кнопочек
            short_name:undefined,   // Путь в апи без упоминания блоков \/\{[A-z0-9]\}\/
            hide_non_required:guiLocalSettings.get('hide_non_required'),
            extension_class_name:["gui_"+i.replace(/\/{[A-z]+}/g, "").replace(/^\/|\/$/g, "").replace(/^\//g, "_")],    // Имена классов от которых надо отнаследоваться
            methodEdit:undefined,
            selectionTag:i.replace(/[^A-z0-9\-]/img, "_"),
        }

        if(type != 'action')
        {
            let short_key = i.replace(/\/{[A-z]+}/g, "").replace(/^\/|\/$/g, "")
            if(!short_schema[short_key])
            {
                short_schema[short_key] = {}
            }
            short_schema[short_key][type] = path_schema[i]
            path_schema[i].short_name = short_key
        }

    }

    // Set flags `canAdd`, `canRemove`, `canDelete`, `canEdit`
    // Проставит флаги canAdd, canRemove, canDelete, canEdit
    for(let path in path_schema)
    {
        let val =  path_schema[path]

        let key = path.replace(/\/{[A-z]+}/g, "").split(/\//g)
        key = key[key.length - 2]

        if(val.type == 'list')
        {
            val.methodAdd = 'post'
            val.canAdd = false
            val.canRemove = false
            if(path_schema['/'+key+'/'] && val.level > 2)
            {
                if(val.api.post != undefined)
                {
                    val.canAdd = true
                    val.shortestURL = path_schema['/'+key+'/']
                }
                val.canRemove = val.api.post != undefined
            }
            val.canCreate = val.api.post != undefined
        }
        else if(val.type == 'page')
        {
            val.canDelete = val.api.delete != undefined
            val.methodDelete = 'delete'


            if( val.api.patch != undefined)
            {
                val.methodEdit = 'patch'
            }

            if( val.api.put != undefined)
            {
                val.methodEdit = 'put'
            }
            val.canEdit = val.methodEdit != undefined;
        }
    }

    // Set `schema` property
    // Проставит свойство schema
    for(let path in path_schema)
    {
        let val =  path_schema[path]
        val.schema = {}

        if(val.type == 'list')
        {
            val.schema.list = {
                fields:openApi_guiPrepareFields(api, val.api.get.fields),
                filters:val.api.get.filters,
                query_type:'get',
                operationId:val.api.get.operationId,
                responses:val.api.get.responses,
            }

            if(val.api.post)
            {
                val.schema.new = {
                    fields:openApi_guiPrepareFields(api, val.api.post.fields),
                    filters:val.api.post.filters,
                    query_type:'post',
                    operationId:val.api.post.operationId,
                    responses:val.api.post.responses,
                }
            }
        }
        else if(val.type == 'page')
        {
            val.schema.get = {
                fields:openApi_guiPrepareFields(api, val.api.get.fields),
                filters:val.api.get.filters,
                query_type:'get',
                operationId:val.api.get.operationId,
                responses:val.api.get.responses,
            }

            for(let f in val.schema.get.fields)
            {
                val.schema.get.fields[f].readOnly = true
            }

            if(val.api.put)
            {
                val.schema.edit = {
                    fields:openApi_guiPrepareFields(api, val.api.put.fields),
                    filters:val.api.put.filters,
                    query_type:'put',
                    operationId:val.api.put.operationId,
                    responses:val.api.put.responses,
                }
            }

            if(val.api.patch)
            {
                val.schema.edit = {
                    fields:openApi_guiPrepareFields(api, val.api.patch.fields),
                    filters:val.api.patch.filters,
                    query_type:'patch',
                    operationId:val.api.patch.operationId,
                    responses:val.api.patch.responses,
                }
            }
        }
        else
        {
            let query_types =  ['post', 'put', 'delete', 'patch']
            for(let q in query_types)
            {
                if(val.api[query_types[q]])
                {
                    let fields = openApi_guiPrepareFields(api, val.api[query_types[q]].fields, true)
                    val.schema.exec = {
                        fields:fields,
                        filters:val.api[query_types[q]].filters,
                        query_type:query_types[q],
                        operationId:val.api[query_types[q]].operationId,
                        responses:val.api[query_types[q]].responses,
                    }
                    val.methodExec = query_types[q]

                    if(Object.keys(fields).length == 0) {
                        val.isEmptyAction = true;
                    }

                    break;
                }
            }
        }
    }

    // Bind list pages and object pages
    // Свяжет страницы списков и страницы объектов
    for(let path in path_schema)
    {
        let val =  path_schema[path]

        if(val.type == 'page')
        {
            let list_path = path.replace(/\{[A-z]+\}\/$/, "")
            if(path_schema[list_path])
            {
                val.list = path_schema[list_path]
                val.list_path = list_path

                path_schema[list_path].page = val
                path_schema[list_path].page_path = path
            }
        }
    }

    // Set `sublinks`, `sublinks_12`, `actions`, `links` property for objects
    // Проставит свойства sublinks, sublinks_l2, actions, links объектам
    for(let path in path_schema)
    {
        let val =  path_schema[path]

        val.sublinks = openApi_get_internal_links(path_schema, path, 1)
        val.sublinks_l2 = openApi_get_internal_links(path_schema, path, 2)

        val.actions = {}
        val.links = {}
        for(let subpage in  val.sublinks)
        {
            let subobj = val.sublinks[subpage]
            if(subobj.type != 'action')
            {
                val.links[subobj.name] = subobj
                continue;
            }

            val.actions[subobj.name] = subobj

        }


        val.multi_actions = []
        for(let subaction in  val.sublinks_l2)
        {
            let subobj = val.sublinks_l2[subaction]
            if(subobj.type != 'action')
            {
                continue;
            }

            val.multi_actions[subobj.name] = subobj
        }

        if(val.type == 'list' && val.page && (val.canRemove || val.page.canDelete))
        {
            val.multi_actions['delete'] = {
                name:"delete",
                onClick:function()
                {
                    if(this.api.canRemove)
                    {
                        return questionDeleteOrRemove(this);
                    }
                    else
                    {
                        return questionDeleteAllSelectedOrNot(this);
                    }

                }
            }
        }
    }

    for(let path in path_schema)
    {
        openApi_set_parents_links(path_schema, path, path_schema[path])
    }

    // Set `schema` property
    // Проставит свойство schema
    for(let path in path_schema)
    {
        let val = path_schema[path]
        for(let schema in path_schema[path].schema)
        {
            val.schema[schema].fields = openApi_guiPrepareAdditionalProperties(path_schema, val, val.schema[schema].fields)
        }
    }

    for(let path in path_schema)
    {
        let val = path_schema[path]
         
        tabSignal.emit("openapi.schema.name."+val.name,  {paths:path_schema, path:path, value:val});
        tabSignal.emit("openapi.schema.type."+val.type,  {paths:path_schema, path:path, value:val});
        for(let schema in val.schema)
        {
            tabSignal.emit("openapi.schema.schema",  {paths:path_schema, path:path, value:val.schema[schema]});
            tabSignal.emit("openapi.schema.schema."+schema,  {paths:path_schema, path:path, value:val.schema[schema], schema:schema});
            tabSignal.emit("openapi.schema.fields",  {paths:path_schema, path:path, value:val.schema[schema], schema:schema, fields:val.schema[schema].fields});
        }

    }

    return {path:path_schema, object:short_schema};
}

function openApi_guiPagesBySchema(schema)
{
    for(let i in schema.path)
    {
        let val = schema.path[i]
        if(val.type == 'list')
        {
            // это список
            openApi_add_list_page_path(val)
        }
        if(val.type == 'page')
        {
            // это один элемент
            openApi_add_one_page_path(val)
        }
        if(val.type == 'action')
        {
            openApi_add_one_action_page_path(val)
        }
    }
}

// Return object by link from `Definitions`
// Вернёт объект из definitions по его ссылке
function getObjectDefinitionByName(api, name, parent_name)
{
    if(!name || !name.replace)
    {
        return;
    }

    // "#/definitions/Group"
    // @todo надо чтоб он правильно извлекал путь а не расчитывал на то что оно всегда в definitions будет
    // need correctly get path, `definition` cann't always have path
    let path = name.replace("#/", "").split(/\//)
    let definition = path[path.length - 1]

    let obj = undefined
    if(definition == "Data")
    {
        if(parent_name)
        {
            obj = {
                properties:{},
                format:"api_"+parent_name,
                type:"object",
            }
        }
    }
    
    obj = mergeDeep({}, api.definitions[definition])
    
    obj.definition_name = definition
    obj.definition_ref = name
    
    if(obj.required)
    {
        for(let j in obj.required)
        {
            obj.properties[obj.required[j]].required = true
        }
    }
     
    tabSignal.emit("openapi.schema.definition",  {definition:obj, api:api, name:name, parent_name:parent_name});
    tabSignal.emit("openapi.schema.definition."+definition,  {definition:obj, name:name, parent_name:parent_name});
     
    return obj
}

/**
 * Ищет описание схемы в объекте рекурсивно
 * Recursive search `schema` description
 * @param {object} obj
 * @returns {undefined|object}
 */
function getObjectNameBySchema(obj, max_level = 0, level = 0)
{
    if(!obj)
    {
        return undefined;
    }

    if(max_level && max_level <= level)
    {
        return undefined;
    }

    if(typeof obj == 'string')
    {
        var name = obj.match(/\/([A-z0-9]+)$/)
        if(name && name[1])
        {
            return obj[i]
        }
        return undefined;
    }

    if(typeof obj != 'object')
    {
        return undefined;
    }

    for(var i in obj)
    {
        if(i == '$ref' || i == "definition_ref")
        {
            var name = obj[i].match(/\/([A-z0-9]+)$/)

            if(name && name[1])
            {
                return obj[i]
            }
        }

        if(typeof obj[i] == 'object')
        {
            let api_obj = getObjectNameBySchema(obj[i], max_level, level+1)
            if(api_obj)
            {
                return api_obj;
            }
        }
    }

    return undefined;
}

/**
 * Вернёт массив вложенных путей для пути base_path
 * Return array of nested path for `base_path`
 * @param {type} api апи
 * @param {type} base_path path in api; путь в апи
 * @returns {Array} actions of this path; экшены этого пути
 */
function openApi_get_internal_links(paths, base_path, targetLevel)
{
    var res = []

    // Build `action` list base on data about one note
    // Список Actions строить будем на основе данных об одной записи.
    for(var api_action_path in paths)
    {
        var api_path_value = paths[api_action_path]

        if(api_action_path.indexOf(base_path) != 0)
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
            continue;
        }

        res[name[1]] = api_path_value
    }

    return res;
}

function openApi_set_parents_links(paths, base_path, parent_obj)
{
    for(var api_action_path in paths)
    {
        var api_path_value = paths[api_action_path]

        if(api_action_path.indexOf(base_path) != 0)
        {
            continue;
        }

        let dif = api_action_path.match(/\//g).length - base_path.match(/\//g).length;
        if(dif != 1)
        {
            continue;
        }

        api_path_value.parent = parent_obj
    }

}


/**
 *
 * @param paths - list of all path
 * @param base_path - path to seatch
 * @param value_name - value to search in `base_path`
 * @param replace_part - value for replace for correct `value_name` for path
 * @returns {*}
 */
function findPath(paths, base_path, value_name, replace_part="_id")
{
    let regexp = new RegExp(replace_part+"$", "");
    value_name = value_name.replace(regexp, "");
    let path_array = base_path.split("/");

    do{
        if(paths[path_array.join("/")+value_name+"/"])
        {
            return path_array.join("/")+value_name+"/"
        }
        else if (path_array.length <= 2)
        {
            return false;
        }

        path_array.splice(path_array.length-2, 1);

    }while(1)
}



function setDefaultPrefetchFunctions(obj)
{
    for(let i in obj.fields)
    {
        if(obj.fields[i].prefetch)
        {
            let field = obj.fields[i]

            if(typeof field.prefetch == "function" || typeof field.prefetch == "object")
            {
                continue;
            }

            let prefetch_path = undefined
            if(typeof field.prefetch == "string")
            {
                prefetch_path = field.prefetch.toLowerCase()
                
                if(!obj.paths[prefetch_path])
                {
                    throw "Error in prefetch_path="+prefetch_path+" field="+JSON.stringify(field)
                }
                 
                obj.fields[i].prefetch = {
                    path:function(path){
                        return function (obj) {
                            return path;
                        }
                    }(prefetch_path),
                }
                 
                continue;
            }
            else
            {
                prefetch_path = i.toLowerCase()
            }

            if(!prefetch_path)
            {  
                continue;
            }

            
            prefetch_path = findPath(obj.paths, obj.path, prefetch_path.replace(/_id$/, "")) 
            if(!obj.paths[prefetch_path])
            { 
                continue;
            }
           
            //obj.fields[i].type = "prefetch";  
            obj.fields[i].prefetch = {
                path:function(path){
                    return function (obj) {
                        return path;
                    }
                }(prefetch_path),
            }
        }
    }
}

tabSignal.connect("openapi.schema.fields", function(obj)
{
    setDefaultPrefetchFunctions.apply(this, arguments)
})

tabSignal.connect("openapi.schema.schema", function(obj)
{

    for (let i in obj.value.responses){
        if (obj.value.responses[i].schema) {
            for (let k in obj.value.responses[i].schema.properties) {
                if(obj.value.responses[i].schema.properties[k].additionalProperties)
                {
                    if(
                        !obj.value.responses[i].schema.redirect_path &&
                        !obj.value.responses[i].schema.redirect_field
                    ) {
                         if (obj.value.responses[i].schema.properties[k].additionalProperties.redirect) {
                            obj.value.responses[i].schema.redirect_path = findPath(obj.paths, obj.path, k);
                            obj.value.responses[i].schema.redirect_field = k;
                            break;
                        }
                        else if (!obj.value.responses[i].schema.properties[k].additionalProperties.redirect) {
                            let redirect_path = obj.path.split("/")
                            redirect_path.splice(redirect_path.length - 2, 1)
                            obj.value.responses[i].schema.redirect_path = redirect_path.join("/");
                            break;
                        }
                    }
                }
            }
        }
    }
})

tabSignal.connect("openapi.schema.type.action", function(obj) {
    let actionResponseDefName;
    try {
        for (let i in obj.value.schema.exec.responses) {
            if (i >= 200 && i < 400 && obj.value.schema.exec.responses[i].schema) {
                try {
                    actionResponseDefName = obj.value.schema.exec.responses[i];
                    break;
                } catch (e) {
                }
            }
        }
    } catch (e)
    {
        console.error("Action " + obj.value.name + " don't have schema")
        return;
    }

    if (!actionResponseDefName)
    {
        console.error("Action " + obj.value.name + " don't have response definition")
        return;
    }

    let test = function(responses, path)
    {
        for (let i in responses)
        {
            let resp = responses[i]
            if (i >= 200 && i < 400 && resp.schema) {
                if (resp.schema.definition_name == actionResponseDefName.schema.definition_name) 
                {
                    actionResponseDefName.schema.redirect_path = path;
                    actionResponseDefName.schema.redirect_field = resp.schema.properties["pk"] || resp.schema.properties["id"];
                    return false;
                }
            }
        }
    }

    try {
        let path = obj.value.parent.path.split("/");
        path.splice(path.length-2, 1);
        test(obj.value.parent.schema.get.responses, path.join("/"))
    } catch (e) {
        return;
    }

    try{
        let path = obj.value.parent.path.split("/");
        path.splice(path.length-2, 1);
        test(obj.value.parent.parent.schema.list.responses, path.join("/"))
    } catch (e) {
        return;
    }

    return;
})
