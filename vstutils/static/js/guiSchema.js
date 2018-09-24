// Replace link to `Definitions` to object in field list
// Заменит ссылки на Definitions на объекты в списке полей
function openApi_guiPrepareFields(api, properties, parent_name)
{
    let fields = mergeDeep({}, properties)
    for(let i in fields)
    {

        let field = fields[i]

        let def_name = getObjectNameBySchema(field, 1)
        if(def_name)
        {
            let def_obj = getObjectDefinitionByName(api, def_name, parent_name+"_"+i)
            if(!def_obj)
            {
                console.error("could not find definition for " + def_name + " object")
                continue;
            }
            field =  mergeDeep({}, def_obj);

            field.readOnly = true

            let format = def_name.replace("#/", "").split(/\//)

            if(format[1] != "Data")
            {
                field.format = "api"+format[1]
            }

            field.definition_ref = def_name
            field.definition_link = openApi_findParentByDefinition(def_obj, def_name)

        }

        let fieldObj;
        if(window.guiElements && field.format && window.guiElements[field.format])
        {
            fieldObj = new window.guiElements[field.format](field)
        }
        else if(window.guiElements && field.type && window.guiElements[field.type])
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

// Replace link from `additionalProperties` to api link for autocomplete work
// Заменит ссылки из additionalProperties на ссылки в апи для работы автокомплитов
function openApi_findParentByDefinition(api_obj, definition)
{
    if(api_obj.type == 'list' && api_obj.api.get)
    {
        let schema = getObjectNameBySchema(api_obj.api.get)
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


// Replace link from `additionalProperties` to api link for autocomplete work
// Заменит ссылки из additionalProperties на ссылки в апи для работы автокомплитов
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
            let link_type = fields[i].gui_links[l]
            
            let definition = link_type.$ref

            for(let l in api_obj.parent.sublinks)
            {
                let list_obj = openApi_findParentByDefinition(api_obj.parent.sublinks[l], definition)
                if(list_obj)
                {
                    fields[i][link_type.prop_name][link_type.list_name] = list_obj
                    break;
                }
            }

            if(fields[i][link_type.prop_name][link_type.list_name])
            {
                continue;
            }

            let definition_obj = openApi_findParentByDefinition(api_obj, definition)
            if(!definition_obj)
            {
                for(let j in path_schema)
                {
                    let val = path_schema[j]
                    if(val.level > 2)
                    {
                        continue;
                    }

                    let list_obj = openApi_findParentByDefinition(val, definition);
                    if(list_obj)
                    {
                        fields[i][link_type.prop_name][link_type.list_name] = list_obj
                        break;
                    }
                }
            }
        } 
    }

   return fields
}

function openApi_guiRemoveReadOnlyMark(properties)
{
    for(let i in properties)
    {
        if(properties[i].definition_ref)
        {
            properties[i].readOnly = false
        }
    }
    return properties
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
            level:urlLevel,
            path:i,
            type:type,
            name:name,
            bulk_name:name,
            api:{
                get:    openApi_guiQuerySchema(api, val.get, 'get', name),
                patch:  openApi_guiQuerySchema(api, val.patch, 'patch', name),
                put:    openApi_guiQuerySchema(api, val.put, 'put', name),
                post:   openApi_guiQuerySchema(api, val.post, 'post', name),
                delete: openApi_guiQuerySchema(api, val.delete, 'delete', name),
            },
            buttons:[], // button array; массив кнопок
            short_name:undefined,
            hide_non_required:guiLocalSettings.get('hide_non_required'),
            extension_class_name:["gui_"+i.replace(/\/{[A-z]+}/g, "").replace(/^\/|\/$/g, "").replace(/^\//g, "_")],
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
                operationId:val.api.get.operationId
            }

            if(val.api.post)
            {
                val.schema.new = {
                    fields:openApi_guiPrepareFields(api, val.api.post.fields),
                    filters:val.api.post.filters,
                    query_type:'post',
                    operationId:val.api.post.operationId
                }
            }
        }
        else if(val.type == 'page')
        {
            val.schema.get = {
                fields:openApi_guiPrepareFields(api, val.api.get.fields),
                filters:val.api.get.filters,
                query_type:'get',
                operationId:val.api.get.operationId
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
                    operationId:val.api.put.operationId
                }
            }

            if(val.api.patch)
            {
                val.schema.edit = {
                    fields:openApi_guiPrepareFields(api, val.api.patch.fields),
                    filters:val.api.patch.filters,
                    query_type:'patch',
                    operationId:val.api.patch.operationId
                }
            }
        }
        else
        {
            debugger;
            let query_types =  ['post', 'put', 'delete', 'patch']
            for(let q in query_types)
            {
                if(val.api[query_types[q]])
                {
                    let fields = openApi_guiRemoveReadOnlyMark(openApi_guiPrepareFields(api, val.api[query_types[q]].fields, true))
                    val.schema.exec = {
                        fields:fields,
                        filters:val.api[query_types[q]].filters,
                        query_type:query_types[q],
                        operationId:val.api[query_types[q]].operationId
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

    if(definition == "Data")
    {
        if(parent_name)
        {
            return {
                properties:{},
                format:"api_"+parent_name,
                type:"object",
            }
        }
    }
    return mergeDeep({}, api.definitions[definition])
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
