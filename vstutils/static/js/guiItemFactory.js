
basePageView = {

}

/**
 * Подготовливает данные к отправке в апи. Приводит их типы к типам модели
 * Если данные не соответсвуют то выкинет исключение
 * @param {Object} values
 * @returns {Object}
 */
basePageView.validateByModel = function (values)
{
   for(var i in this.model.fileds)
   {
       var filed = this.model.fileds[i];
       if(values[filed.name] !== undefined)
       {
           if(filed.type == "string" || filed.type == "file")
           {
               values[filed.name] = values[filed.name].toString()
           }
           else if(filed.type == "number" || filed.type == "integer" )
           {
               values[filed.name] = values[filed.name]/1
           }
           else if(filed.type == "boolean" )
           {
               values[filed.name] = values[filed.name] == true
           }

           if(filed.maxLength && values[filed.name].toString().length > filed.maxLength)
           {
               throw {error:'validation', message:'Filed '+filed.name +" too long"}
           }

           if(filed.minLength && values[filed.name].toString().length < filed.minLength)
           {

               if(filed.minLength && values[filed.name].toString().length == 0)
               {
                   throw {error:'validation', message:'Filed '+filed.name +" empty"}
               }

               throw {error:'validation', message:'Filed '+filed.name +" too short"}
           }
       }
   }

   return values;
}

/**
 * Отрисует поле при отрисовке объекта.
 * @param {object} filed
 * @returns {html}
 */
basePageView.renderFiled = function(filed)
{
    if(!this.model.guiFileds[filed.name])
    {
        if(filed.schema && filed.schema.$ref)
        {
            var obj = getObjectBySchema(filed.schema.$ref)
            if(obj)
            {
                var filed_value = undefined
                if(this.model.data)
                {
                    filed_value = this.model.data[filed.name]
                }

                obj = new obj.one(undefined, filed_value)

                this.model.guiFileds[filed.name] = obj
            }
        }
        else if(filed.$ref)
        {
            var obj = getObjectBySchema(filed.$ref)
            if(obj)
            {
                var filed_value = undefined
                if(this.model.data)
                {
                    filed_value = this.model.data[filed.name]
                }

                obj = new obj.one(undefined, filed_value)

                this.model.guiFileds[filed.name] = obj
            }
        }

        if(!this.model.guiFileds[filed.name])
        {
            var type = filed.format

            if(!type && filed.enum !== undefined)
            {
                type = 'enum'
            }

            if(!type)
            {
                type = filed.type
            }

            if(!window.guiElements[type])
            {
                type = "string"
            }

            var filed_value = undefined
            if(this.model.data)
            {
                filed_value = this.model.data[filed.name]
            }
            this.model.guiFileds[filed.name] = new window.guiElements[type](filed, filed_value)
        }
    }

    return this.model.guiFileds[filed.name].render()
}

basePageView.getValue = function ()
{
    var obj = {}
    for(var i in this.model.guiFileds)
    {
        obj[i] = this.model.guiFileds[i].getValue();
    }

    return obj;
}

basePageItem = {}
  
basePageItem.getBulkName = function ()
{
    if(!this.model.pathInfo)
    {
        return;
    }

    if(this.model.pathInfo.bulk_name)
    {
        return this.model.pathInfo.bulk_name
    }
    
    if(this.model.pathInfo.api_path)
    {
        var name = this.model.pathInfo.api_path.replace(/\{[A-z]+\}\/$/, "").toLowerCase().match(/\/([A-z0-9]+)\/$/);
        this.model.pathInfo.bulk_name = name[1]
    }

    return name[1];
}

/**
 * Фабрика классов объектов
 * @returns {Object}
 */
function guiItemFactory(api, list, one)
{
    var thisFactory = {
        /**
         * Фабрика объектов сущьности
         * @param {Object} init_options параметры инициализации
         * @returns {guiItemFactory.guiForWebAnonym$5}
         *
         * @note init_options Могут по идее принимать определение параметров страницы из апи
         * Тогда в объект законным образом попадёт bulk_name и параметры фильтрации
         *
         */
        one:function(page_options, object){

            /**
             * @class guiApi
             */
            this.api = api

            this.model = one.model
            this.model.pathInfo = undefined

            this.model.guiFileds = {}
            this.model.isSelected = {}

            this.load = function (filters)
            {
                var thisObj = this;
                var def = undefined;

                var query = undefined;

                if(this.model.pathInfo && this.model.pathInfo.get && this.model.pathInfo.get.operationId)
                {
                    var operations = this.model.pathInfo.get.operationId.split("_");
                    if(operations.length >= 3)
                    {
                        query = {
                            type: "mod",
                            item: operations[0],
                            data_type:this.model.pageInfo.page.replace(/^[A-z]+\/[0-9]+\//, ""),
                            method:"get"
                        }

                        for(var i in this.model.pageInfo)
                        {
                            if(/^api_/.test(i))
                            {
                                query[i.replace(/api_/, "")] = this.model.pageInfo[i]
                            }
                        }
                    }
                }

                if(!query)
                {
                    if(filters.parent_id && filters.parent_type)
                    {
                        query = {
                            type: "mod",
                            item: filters.parent_type,
                            data_type:this.getBulkName(),
                            method:"get",
                            pk:filters.parent_id
                        }
                    }
                    else
                    {
                        query = {
                            type: "get",
                            item: this.getBulkName(),
                            pk:filters.api_pk
                        }
                    }
                }

                def = api.query(query)

                $.when(def).done(function(data){
                    thisObj.model.data = data.data
                    thisObj.model.status = data.status
                })

                return def;
            }

            this.init = function (page_options, object)
            {
                if(!page_options)
                {
                    page_options = this.getShortestApiURL()
                }

                if(object)
                {
                    this.model.data = object
                    this.model.status = 200
                }
                
                if(page_options)
                {
                    this.model.pathInfo = page_options.api
                    this.model.pageInfo = page_options.url

                }
                
                if(this.model.pathInfo)
                {
                    // Список Actions строить будем на основе данных api
                    this.model.sublinks = openApi_get_internal_links(this.api, this.model.pathInfo.api_path, 1); 
                }
            }

            this.create = function ()
            {
                var thisObj = this;
                var res = this.sendToApi("add")
                $.when(res).done(function()
                {
                    $.notify("Changes in "+thisObj.view.bulk_name+" were successfully created", "success");
                })
                return res;
            }

            this.update = function ()
            {
                var thisObj = this;
                var res = this.sendToApi("set")
                $.when(res).done(function()
                {
                    $.notify("Changes in "+thisObj.view.bulk_name+" were successfully saved", "success");
                })
                return res;
            }

            this.sendToApi = function (method)
            {
                var def = new $.Deferred();
                var data = {}

                try{
                    data = this.getValue()
                    if (this['onBefore'+method])
                    {
                        data = this['onBefore'+method].apply(this, [data]);
                        if (data == undefined || data == false)
                        {
                            def.reject()
                            return def.promise();
                        }
                    }

                    data = this.validateByModel(data)

                    var query = {
                                type: method,
                                item: this.getBulkName(),
                                data:data,
                            }

                    if(this.model.pathInfo)
                    {
                        var operations = []
                        var query_method = ""

                        if(method == 'add' && this.model.pathInfo.post && this.model.pathInfo.post.operationId)
                        {
                            operations = this.model.pathInfo.post.operationId.split("_");
                            query_method = "post"
                        }

                        if(method == 'set' && this.model.pathInfo.put && this.model.pathInfo.put.operationId)
                        {
                            operations = this.model.pathInfo.put.operationId.split("_");
                            query_method = "put"
                        }

                        if(method == 'set' && this.model.pathInfo.patch && this.model.pathInfo.patch.operationId)
                        {
                            operations = this.model.pathInfo.patch.operationId.split("_");
                            query_method = "patch"
                        }

                        if(operations.length >= 3)
                        {
                            query = {
                                type: "mod",
                                item: operations[0],
                                data_type:this.model.pageInfo.page.replace(/^[A-z]+\/[0-9]+\//, ""),
                                data:data,
                                method:query_method
                            }

                            query.pk = this.model.pageInfo['api_pk']
                        }
                    }

                    if(!query.pk && method == 'set')
                    {
                        query.pk = this.model.data.id
                    }
                    debugger;
                    $.when(api.query(query)).done(function (data)
                        {
                            def.resolve(data)
                        }).fail(function (e)
                        {
                            def.reject(e)
                            polemarch.showErrors(e.responseJSON)
                        })

                }catch (e) {
                    polemarch.showErrors(e)

                    def.reject()
                    if(e.error != 'validation')
                    {
                        throw e
                    }
                }

                return def.promise();
            }

            this.delete = function (){

                var def = new $.Deferred();

                try{

                    if (this.onBeforeDelete)
                    {
                        if (!this.onBeforeDelete.apply(this, []))
                        {
                            def.reject()
                            return def.promise();
                        }
                    }

                    var thisObj = this;
                    $.when(api.query({
                                        type: "del",
                                        item: this.getBulkName(),
                                        pk:this.model.data.id
                                    })
                        ).done(function (data)
                        {
                            $.notify(""+thisObj.view.bulk_name+" were successfully deleted", "success");
                            def.resolve(data)
                        }).fail(function (e)
                        {
                            def.reject(e)
                            polemarch.showErrors(e.responseJSON)
                        })
                }catch (e) {
                    polemarch.showErrors(e)
                    def.reject()
                    return def.promise();
                }

                return def.promise();
            }

            this.copy   = function (){ }

            /**
             * Функция должна вернуть или html код блока или должа пообещать что вернёт html код блока позже
             * @returns {string|promise}
             */
            this.renderAsPage = function ()
            {
                var thisObj = this;
                var tpl = thisObj.view.bulk_name + '_one'
                if (!spajs.just.isTplExists(tpl))
                {
                    tpl = 'entity_one'
                }

                return spajs.just.render(tpl, {query: "", guiObj: thisObj, opt: {}});
            }

            /**
             * Функция должна вернуть или html код блока или должа пообещать что вернёт html код блока позже
             * @returns {string|promise}
             */
            this.renderAsNewPage = function ()
            {
                var thisObj = this;
                var tpl = thisObj.view.bulk_name + '_new'
                if (!spajs.just.isTplExists(tpl))
                {
                    tpl = 'entity_new'
                }

                return spajs.just.render(tpl, {query: "", guiObj: thisObj, opt: {}});
            }

            /**
             * Отрисует объект как поле ввода
             * Функция должна вернуть или html код блока или должа пообещать что вернёт html код блока позже
             * @returns {string|promise}
             */
            this.render = function ()
            {
                var thisObj = this;
                var tpl = thisObj.view.bulk_name + '_one_as_filed'
                if (!spajs.just.isTplExists(tpl))
                {
                    tpl = 'entity_one_as_filed'
                }

                return spajs.just.render(tpl, {query: "", guiObj: thisObj, opt: {}});
            }

            // Если окажется что extend копирует оригинал а не назначает по ссылке то можно будет заменить для экономии памяти.
            var res = $.extend(this, basePageItem, basePageView, thisFactory.one);


            res.parent = thisFactory
            /**
             * Перегрузить поля объекта создаваемого фабрикой можно таким образом
             *
                tabSignal.connect("gui.new.group.list", function(data)
                {
                    // Тут код который будет модифицировать создаваемый объект
                    data.model.fileds = [
                        {
                            title:'Name',
                            name:'name',
                        },
                    ]
                })
             */
            tabSignal.emit("gui.new."+this.view.bulk_name+".one", res);

            res.init(page_options, object)

            return res;
        },
        /**
         * Фабрика объектов списка сущьностей
         * @returns {guiItemFactory.guiForWebAnonym$6}
         */
        list:function(page_options, objects)
        {
            this.state = {
                search_filters:{}
            }

            /**
             * Используется в шаблоне страницы
             */
            this.model = list.model

            this.model.selectedItems = {}

            /**
             * @class guiApi
             */
            this.api = api
            this.model.pathInfo = undefined
            this.model.sublinks = {}
            this.model.multi_actions = {}
            
            /**
             * Переменная на основе пути к апи которая используется для группировки выделенных элементов списка
             * Чтоб выделение одного списка не смешивалось с выделением другого списка
             */
            this.model.selectionTag = "";

            this.init = function (page_options, objects)
            {
                if(!page_options)
                {
                    page_options = this.getShortestApiURL()
                }

                if(objects)
                {
                    this.model.data = objects
                    this.model.status = 200
                }

                if(page_options)
                {
                    this.model.pathInfo = page_options.api
                    this.model.pageInfo = page_options.url
                }
                
                if(this.model.pathInfo)
                {
                    // Список Actions строить будем на основе данных api
                    this.model.sublinks = openApi_get_internal_links(this.api, this.model.pathInfo.api_path, 2);
                    this.model.selectionTag = this.model.pathInfo.api_path
                    
                    // Тут надо обработать sublinks так чтоб добавить методы удалить объект и отделить страницы от экшенов поддерживающих мультиоперации 
                    for(var i in this.model.sublinks)
                    {
                        if(!this.model.sublinks[i].isAction)
                        {
                            continue;
                        }
                        this.model.multi_actions[i] = this.model.sublinks[i]
                    }
                    
                    // @todo тут надо решить каким то образом надо ли добавлять кнопку удаления объектов из базы
                    this.model.multi_actions['delete'] = {
                        name:"delete"
                    }
                    
                    // @todo надо решить каким то образом надо ли добавлять кнопку удаления объектов из списка или нет.
                    this.model.multi_actions['remove'] = {
                        name:"remove"
                    }
                    
                }
                
                window.guiListSelections.intTag(this.model.selectionTag) 
            }

            /**
             * Функция поиска
             * @returns {jQuery.ajax|spajs.ajax.Call.defpromise|type|spajs.ajax.Call.opt|spajs.ajax.Call.spaAnonym$10|Boolean|undefined|spajs.ajax.Call.spaAnonym$9}
             */
            this.search = function (filters)
            { 
                var thisObj = this;
                this.model.filters = filters
                 
                var def = this.load(filters)
                $.when(def).done(function(data){
                    thisObj.model.data = data.data 
                })
                
                return def
            }
            
            /**
             * Функция загрузки данных 
             * @returns {jQuery.ajax|spajs.ajax.Call.defpromise|type|spajs.ajax.Call.opt|spajs.ajax.Call.spaAnonym$10|Boolean|undefined|spajs.ajax.Call.spaAnonym$9}
             */
            this.load = function (filters)
            {
                if (!filters)
                {
                    filters = {};
                }
 
                if (!filters.limit)
                {
                    filters.limit = 20;
                }

                if (!filters.offset)
                {
                    filters.offset = 0;
                }

                if (!filters.ordering)
                {
                    filters.ordering = "desc";
                }

                if (filters.page_number)
                { 
                    filters.offset = (filters.page_number-1)/1*filters.limit; 
                }

                var q = [];

                q.push("limit=" + encodeURIComponent(filters.limit))
                q.push("offset=" + encodeURIComponent(filters.offset))
                q.push("ordering=" + encodeURIComponent(filters.ordering))

                if(filters.query)
                {
                    if(typeof filters.query == "string")
                    {
                        filters.query = this.searchStringToObject(filters.query)
                    }

                    for (var i in filters.query)
                    {
                        if (Array.isArray(filters.query[i]))
                        {
                            for (var j in filters.query[i])
                            {
                                filters.query[i][j] = encodeURIComponent(filters.query[i][j])
                            }
                            q.push(encodeURIComponent(i) + "=" + filters.query[i].join(","))
                            continue;
                        }
                        q.push(encodeURIComponent(i) + "=" + encodeURIComponent(filters.query[i]))
                    }
                }

                var queryObj = {}
                if(filters.parent_id && filters.parent_type)
                {
                    queryObj = {
                        type: "mod",
                        item: filters.parent_type,
                        filters:q.join("&"),
                        data_type:this.getBulkName(),
                        method:"get",
                        pk:filters.parent_id
                    }
                }
                else
                {
                    queryObj = {
                        type: "get",
                        item: this.getBulkName(),
                        filters:q.join("&")
                    }
                }

                return api.query(queryObj);
            }

            this.toggleSelectEachItem = function (tag, mode)
            {
                if(!mode)
                {
                    window.guiListSelections.unSelectAll(tag)
                    return false;
                }
                
                let filters = this.model.filters
                
                filters.limit = 9999999
                filters.offset = 0;
                filters.page_number = 0;
                
                return $.when(this.load(filters)).done(function(data)
                {
                    if(!data || !data.data || !data.data.results)
                    {
                        return;
                    }
                    
                    let ids = []
                    for(let i in data.data.results)
                    {
                        ids.push(data.data.results[i].id)
                    }
                    
                    window.guiListSelections.setSelection(tag, ids, mode); 
                }).promise()
            }

            /**
             * Преобразует строку поиска в объект с параметрами для фильтрации
             * @param {string} query строка запроса
             * @param {string} defaultName имя параметра по умолчанию
             * @returns {pmItems.searchStringToObject.search} объект для поиска
             */
            this.searchStringToObject = function (query, defaultName)
            {
                var search = {}
                if (query == "")
                {
                    return search;
                }

                if (!defaultName)
                {
                    defaultName = 'name'
                }

                search[defaultName] = query;

                return search;
            }

            /**
             * Функция должна вернуть или html код блока или должа пообещать чтол вернёт html код блока позже
             * @returns {string|promise}
             */
            this.renderAsPage = function ()
            {
                var thisObj = this;
                var tpl = thisObj.view.bulk_name + '_list'
                if (!spajs.just.isTplExists(tpl))
                {
                    tpl = 'entity_list'
                }
                thisPageObj = this

                var showAddToListForm = false
                if(this.getShortestApiURL().level == 2 && 2 < this.model.pathInfo.api_path.match(/\//g).length)
                {
                    // Кротчайший урл равен 2 и при этом это список и текущий урл больше 2
                    // значит нужно показать форму добавления объектов из общего списка в этот.
                    showAddToListForm = true 
                }

                return spajs.just.render(tpl, {query: "", guiObj: thisObj, opt: {showAddToListForm:showAddToListForm}});
            }

            /**
             * Функция должна вернуть или html код блока или должа пообещать чтол вернёт html код блока позже
             * @returns {string|promise}
             */
            this.renderAsAddSubItemsPage = function ()
            {
                var thisObj = this;
                var tpl = thisObj.view.bulk_name + '_list_add_subitems'
                if (!spajs.just.isTplExists(tpl))
                {
                    tpl = 'entity_list_add_subitems'
                }
                //tpl = 'entity_list'
                
                return spajs.just.render(tpl, {query: "", guiObj: thisObj, opt: {}});
            }
            this.delete = function (){ }

            ////////////////////////////////////////////////
            // pagination
            ////////////////////////////////////////////////

            this.paginationHtml = function ()
            {
                var list = this.model.data

                // http://testserver/api/v2/host/?limit=20&offset=40&ordering=desc
                var limit = this.view.page_size;
                var offset = 0;

                if(this.model && this.model.data && this.model.data.previous)
                {
                    limit = this.model.data.previous.match(/limit=([0-9]+)/)
                    offset = this.model.data.previous.match(/offset=([0-9]+)/)
                    if(limit && limit[1])
                    {
                        if(offset && offset[1])
                        {
                            list.offset = offset[1]/1 + limit[1]/1
                        }
                        else
                        {
                            list.offset = limit[1]/1
                        }
                    }
                }
                else if(this.model && this.model.data && this.model.data.next)
                {
                    limit = this.model.data.next.match(/limit=([0-9]+)/)
                    offset = 0
                }

                if(limit && limit[1])
                {
                    limit = limit[1]/1
                }
                else
                {
                    limit = this.view.page_size
                }

                var totalPage = list.count / limit
                if (totalPage > Math.floor(totalPage))
                {
                    totalPage = Math.floor(totalPage) + 1
                }

                var currentPage = 0;
                if (list.offset)
                {
                    currentPage = Math.floor(list.offset / limit)
                }
                var url = window.location.href
               
                return  spajs.just.render('pagination', {
                    totalPage: totalPage,
                    currentPage: currentPage,
                    url: url})
            }

            this.getTotalPages = function ()
            {
                var limit = this.view.page_size

                if( this.model && this.model.data && this.model.data.previous )
                {
                    var limitLink = this.model.data.previous.match(/limit=([0-9]+)/)
                    if( limitLink && limitLink[1])
                    {
                        limit = limitLink[1]/1
                    }
                }
                if( this.model && this.model.data && this.model.data.next )
                {
                    var limitLink = this.model.data.next.match(/limit=([0-9]+)/)
                    if( limitLink && limitLink[1])
                    {
                        limit = limitLink[1]/1
                    }
                }

                return this.model.data.count / limit
            }

            var res = $.extend(this, basePageItem, thisFactory.list);

            res.parent = thisFactory
            /**
             * Перегрузить поля объекта создаваемого фабрикой можно таким образом
             *
                tabSignal.connect("gui.new.group.list", function(data)
                {
                    // Тут код который будет модифицировать создаваемый объект
                    data.model.fileds = [
                        {
                            title:'Name',
                            name:'name',
                        },
                    ]
                })
             */
            tabSignal.emit("gui.new."+this.view.bulk_name+".list", res);

            res.init(page_options, objects)

            return res;
        },

        /**
         * Преобразует строку и объект поиска в строку для урла страницы поиска
         * @param {string} query строка запроса
         * @param {string} defaultName имя параметра по умолчанию
         * @returns {string} строка для параметра страницы поиска
         */
        searchObjectToString:function (query, defaultName)
        {
            return encodeURIComponent(query);
        },

        /**
         * Если поисковый запрос пуст то вернёт true
         * @param {type} query
         * @returns {Boolean}
         */
        isEmptySearchQuery:function (query)
        {
            if (!query || !trim(query))
            {
                return true;
            }

            return false;
        }
    }

    /**
     * Представление полученное из апи
     *
     * Описание полей из апи
     */
    thisFactory.list.view = list.view

    /**
     * Представление полученное из апи
     */
    thisFactory.one.view = one.view

    thisFactory.one.actions = {}
    thisFactory.list.actions = {}

    thisFactory.one.sublinks = {}
    thisFactory.list.sublinks = {}
    
    var getShortestApiURL = function ()
    {
        var url = {};
        var level = 100;
        for(var i in this.view.urls)
        {
            if(level >= this.view.urls[i].level)
            {
                level = this.view.urls[i].level
                url = this.view.urls[i]
            }
        }

        return url;
    }
    
    thisFactory.one.getShortestApiURL = getShortestApiURL
    thisFactory.list.getShortestApiURL = getShortestApiURL
    
    return thisFactory;
}

/**
 * Класс работы с actions
 * @param {type} api
 * @param {type} action
 * @returns {guiActionFactory.thisFactory}
 */
function guiActionFactory(api, action)
{
    var parameters;
    if(action.action.post )
    {
        parameters = action.action.post.parameters
    }

    if(action.action.delete )
    {
        if(parameters)
        {
            debugger;
        }
        parameters = action.action.delete.parameters
    }

    if(action.action.put )
    {
        if(parameters)
        {
            debugger;
        }
        parameters = action.action.put.parameters
    }

    if(action.action.patch )
    {
        if(parameters)
        {
            debugger;
        }
        parameters = action.action.patch.parameters
    }

    var list_fileds = []
    for(var i in parameters)
    {
        if($.inArray(i, ['url', 'id']) != -1)
        {
            continue;
        }

        var val = parameters[i]
        val.name = i


        list_fileds.push(val)
    }


    var thisFactory = function(){
        /**
         * @class guiApi
         */
        this.model = {}
        this.model.fileds = list_fileds
        this.model.guiFileds = {}

        this.exec = function ()
        {

        }

        this.renderAsPage = function ()
        {
            var tpl = 'action_page_'+this.model.name
            if (!spajs.just.isTplExists(tpl))
            {
                tpl = 'action_page'
            }

            return spajs.just.render(tpl, {query: "", guiObj: this, opt: {}});
        }

        var res = $.extend(this, basePageView, thisFactory);
 
        return res;
    }

    thisFactory.api = api

    thisFactory.view = action

    return thisFactory;
}














































/**
 * Выполняет переход на страницу с результатами поиска
 * Урл строит на основе того какая страница открыта.
 *
 * @param {string} query
 * @returns {$.Deferred}
 */
function goToSearch(obj, query)
{
    if (obj.isEmptySearchQuery(query))
    {
        spajs.openURL(spajs.urlInfo.data.reg.baseURL());
    }

    return spajs.openURL(spajs.urlInfo.data.reg.searchURL(obj.searchObjectToString(trim(query))));
}

function deleteAndGoUp(obj)
{
    var def = obj.delete();
    $.when(def).done(function(){
        debugger;
        spajs.openURL(spajs.urlInfo.data.reg.baseURL());
    })

    return def;
}

function createAndGoEdit(obj)
{
    var def = obj.create();
    $.when(def).done(function(newObj){

        spajs.openURL(spajs.urlInfo.data.reg.baseURL(newObj.data.id));
    })

    return def;
}

function goToMultiAction(ids, action)
{  
    return spajs.openURL(window.hostname + "?" + spajs.urlInfo.data.reg.page_and_parents+"/"+ids.join(",")+"/"+action);
}

function goToMultiActionFromElements(elements, action)
{  
    let ids = []
    for (var i = 0; i < elements.length; i++)
    {
        ids.push($(elements[i]).attr('data-id'))
    }
        
    return goToMultiAction(ids, action)
}


function renderErrorAsPage(error)
{
    return spajs.just.render('error_as_page', {error:error, opt: {}});
}

function isEmptyObject(obj){
    return Object.keys(obj).length == 0
}