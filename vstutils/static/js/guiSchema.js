
// Заменит ссылки на Definitions на списки полей из Definitions
function openApi_guiQuerySchema(api, query_schema)
{
    if(query_schema && query_schema.parameters)
    {
        query_schema.filters = query_schema.parameters
        delete query_schema.parameters;
    }

    let def_name = getObjectNameBySchema(query_schema)
    if(!def_name)
    {
        return query_schema;
    }

    let def_obj = getObjectDefinitionByName(api, def_name)
    if(!def_obj)
    {
        return query_schema;
    }

    query_schema.fields = $.extend({}, def_obj.properties)

    for(let i in query_schema.fields)
    {
        query_schema.fields[i].name = i
    }
    
    return query_schema;
}

// Сгенерирует схему на основе апи
function openApi_guiSchema(api)
{
    let path_schema = {}
    let short_schema = {}

    // Проставит типы страниц ('page' или 'list'  или 'action')
    for(let i in api.paths)
    {
        let val = api.paths[i]

        // Уровень вложености меню (по идее там где 1 покажем в меню с лева)
        let urlLevel = (i.match(/\//g) || []).length

        let type = undefined
        if(val.get )
        {
            // @todo перезавязаться с operationId на тип ответа в схеме get запроса
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
            level:urlLevel,
            path:i,
            type:type,
            name:name,
            bulk_name:name,
            api:{
                get:openApi_guiQuerySchema(api, val.get),
                patch:openApi_guiQuerySchema(api, val.patch),
                put:openApi_guiQuerySchema(api, val.put),
                post:openApi_guiQuerySchema(api, val.post),
                delete:openApi_guiQuerySchema(api, val.delete),
            },
            buttons:[], // массив кнопок
            short_name:undefined,
            hide_non_required:guiLocalSettings.get('hide_non_required'),
            extension_class_name:["gui_"+i.replace(/\/{[A-z]+}/g, "").replace(/^\/|\/$/g, "").replace(/^\//g, "_")]
              
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

    // Проставит флаги canAdd, canRemove, canDelete, canEdit
    for(let path in path_schema)
    {
        let val =  path_schema[path]

        let key = path.replace(/\/{[A-z]+}/g, "").split(/\//g)
        key = key[key.length - 2]

        if(val.type == 'list')
        {
            val.canAdd = false
            val.canRemove = false
            if(path_schema['/'+key+'/'] && val.level > 2)
            { 
                if(val.api.post != undefined)
                {
                    val.canAdd = path_schema['/'+key+'/']
                }
                val.canRemove = val.api.post != undefined
            }
            val.canCreate = val.api.post != undefined
        }
        else if(val.type == 'page')
        {
            val.canDelete = val.api.delete != undefined
            val.canEdit = ( val.api.patch != undefined || val.api.put != undefined )
        }
    }

    // Проставит свойство schema
    for(let path in path_schema)
    {
        let val =  path_schema[path]

        if(val.type == 'list' || val.type == 'page')
        {
            val.schema = {
                fields:val.api.get.fields,
                filters:val.api.get.filters,
                query_type:'get'
            }
        }
        else
        { 
            let query_types =  ['post', 'put', 'delete', 'patch']
            for(let q in query_types)
            {
                if(val.api[query_types[q]])
                {
                    val.schema = {
                        fields:val.api[query_types[q]].fields,
                        filters:val.api[query_types[q]].filters,
                        query_type:query_types[q]
                    }
                    break;
                }
            }
        }
    }

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

// Вернёт объект из definitions по его ссылке
function getObjectDefinitionByName(api, name)
{
    if(!name || !name.replace)
    {
        return;
    }

    // "#/definitions/Group"
    // @todo надо чтоб он правильно извлекал путь а не расчитывал на то что оно всегда в definitions будет
    let path = name.replace("#/", "").split(/\//)
    return api.definitions[path[path.length - 1]]
}

function getObjectBySchema(obj)
{
    let name = getObjectNameBySchema(obj);
    if(!name)
    { 
        return undefined
    }

    let apiname = "api" + name.toLowerCase().replace(/^One/i, "")
    let api_obj = window[apiname]
    if(api_obj)
    {
        debugger;
        return api_obj;
    }
}
/**
 * Ищет описание схемы в объекте рекурсивно
 * @param {object} obj
 * @returns {undefined|object}
 */
function getObjectNameBySchema(obj)
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
        if(i == '$ref')
        {
            var name = obj[i].match(/\/([A-z0-9]+)$/)

            if(name && name[1])
            {
                return obj[i]
            }
        }

        if(typeof obj[i] == 'object')
        {
            let api_obj = getObjectNameBySchema(obj[i])
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
 * @param {type} api апи
 * @param {type} base_path путь в апи
 * @returns {Array} экшены этого пути
 */
function openApi_get_internal_links(paths, base_path, targetLevel)
{
    var res = []
    // Список Actions строить будем на основе данных об одной записи.
    for(var api_action_path in paths)
    {
        var api_path_value = paths[api_action_path]


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

        res[name[1]] = api_path_value
    }

    return res;
}

// * @deprecated
function ifDataTypeDefinitions(field, name)
{
    if(field && field.$ref == "#/definitions/Data")
    {
        console.log("New data field ", name)
        delete field.$ref;
        field.format = name
        if(!field.type)
        {
            field.type = "object";
        }
        return field
    }

    return field
}