
/**
 * Фабрика классов объектов
 * @returns {Object}
 */
function guiItemFactory(api, list, one)
{
    var thisFactory = {
        /**
         * Фабрика объектов сущьности
         * @returns {guiItemFactory.guiForWebAnonym$5}
         */
        one:function(){

            /**
             * @class guiApi
             */
            this.api = api

            this.model = one.model
            this.model.selectedItems = {}
            this.model.guiFileds = {}
            
            this.load = function (item_id)
            {
                var thisObj = this;
                if (!item_id)
                {
                    throw "Error in pmItems.loadItem with item_id = `" + item_id + "`"
                }

                var def = api.query({
                    type: "get",
                    item: this.view.bulk_name,
                    pk:item_id
                })
                $.when(def).done(function(data){
                    thisObj.model.data = data.data
                    thisObj.model.status = data.status
                })

                return def;
            }
            
            this.init = function (item_data)
            {
                this.model.data = item_data
                this.model.status = 200
            }

            this.create = function (){ }
            this.update = function ()
            {
                var def = new $.Deferred();
                var data = {}
                
                try{
                    data = this.getValue()
                    if (this.onBeforeSave)
                    {
                        data = this.onBeforeSave.apply(this, [data]);
                        if (data == undefined || data == false)
                        {
                            def.reject()
                            return def.promise();
                        }
                    }

                    data = this.validateByModel(data)

                    var thisObj = this; 
                    $.when(api.query({
                                        type: "set",
                                        item: this.view.bulk_name,
                                        data:data,
                                        pk:this.model.data.id
                                    })
                        ).done(function (data)
                        {
                            $.notify("Changes in "+thisObj.view.bulk_name+" were successfully saved", "success"); 
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
            
            /**
             * Подготовливает данные к отправке в апи. Приводит их типы к типам модели
             * Если данные не соответсвуют то выкинет исключение
             * @param {Object} values
             * @returns {Object}
             */
            this.validateByModel = function (values)
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
                            throw {code:'validation', error:'Filed '+filed.name +" too long"}
                        }
                        
                        if(filed.minLength && values[filed.name].toString().length < filed.minLength)
                        {
                            throw {code:'validation', error:'Filed '+filed.name +" too short"}
                        } 
                    }
                }
                 
                return values;
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
                                        item: this.view.bulk_name, 
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
            
            /**
             * Отрисует поле при отрисовке объекта.
             * @param {object} filed
             * @returns {html}
             */
            this.renderFiled = function(filed)
            {
                if(!this.model.guiFileds[filed.name])
                {
                    if(filed.$ref)
                    {
                        var obj = getObjectBySchema(filed.$ref)
                        if(obj)
                        {
                            obj = new obj.one()
                            obj.init(this.model.data[filed.name])
                            
                            this.model.guiFileds[filed.name] = obj
                        }
                    }
                    
                    if(!this.model.guiFileds[filed.name])
                    { 
                        var type = filed.format

                        if(!type)
                        {
                            type = filed.type
                        }


                        if(!window.guiElements[type])
                        {
                            type = "string"
                        }

                        this.model.guiFileds[filed.name] = new window.guiElements[type](filed, this.model.data[filed.name])
                    }
                }
                
                return this.model.guiFileds[filed.name].render() 
            }
            
            this.getValue = function ()
            {
                var obj = {} 
                for(var i in this.model.guiFileds)
                {
                    obj[i] = this.model.guiFileds[i].getValue();
                }
                
                return obj;
            }
              
            var res = $.extend(this, thisFactory.one);

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
            return res;
        },
        /**
         * Фабрика объектов списка сущьностей
         * @returns {guiItemFactory.guiForWebAnonym$6}
         */
        list:function()
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

            /**
             * Функция поиска 
             * @returns {jQuery.ajax|spajs.ajax.Call.defpromise|type|spajs.ajax.Call.opt|spajs.ajax.Call.spaAnonym$10|Boolean|undefined|spajs.ajax.Call.spaAnonym$9}
             */
            this.search = function (filters)
            {
                if (!filters)
                {
                    filters = {};
                }

                this.model.filters = filters

                var thisObj = this;
                if (!filters.limit)
                {
                    filters.limit = 999;
                }

                if (!filters.offset)
                {
                    filters.offset = 0;
                }

                if (!filters.ordering)
                {
                    filters.ordering = "";
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
                
                
                var def = undefined;
                if(filters.parent_id && filters.parent_type)
                { 
                    def = api.query({
                        type: "mod",
                        item: filters.parent_type,
                        filters:q.join("&"),
                        data_type:this.view.bulk_name,
                        method:"get",
                        pk:filters.parent_id
                    })
                }
                else
                { 
                    def = api.query({
                        type: "get",
                        item: this.view.bulk_name,
                        filters:q.join("&")
                    })
                }

                $.when(def).done(function(data){
                    thisObj.model.data = data.data
                })

                return def;
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

                return spajs.just.render(tpl, {query: "", guiObj: thisObj, opt: {}});
            }

            this.delete = function (){ }

            ////////////////////////////////////////////////
            // pagination
            ////////////////////////////////////////////////

            this.paginationHtml = function ()
            {
                var list = this.model.data
                var totalPage = list.count / list.limit
                if (totalPage > Math.floor(totalPage))
                {
                    totalPage = Math.floor(totalPage) + 1
                }

                var currentPage = 0;
                if (list.offset)
                {
                    currentPage = Math.floor(list.offset / list.limit)
                }
                var url = window.location.href
                return  spajs.just.render('pagination', {
                    totalPage: totalPage,
                    currentPage: currentPage,
                    url: url})
            }

            this.getTotalPages = function ()
            {
                return this.model.data.count / this.model.data.limit
            }

            var res = $.extend(this, thisFactory.list);

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
     * view = {
     *      bulk_name - имя в bulk запросе
     *      fileds - поля
     * }
     */
    thisFactory.list.view = list.view

    /**
     * Представление полученное из апи
     *
     * Описание полей из апи
     * view = {
     *      bulk_name - имя в bulk запросе
     *      fileds - поля
     * }
     */
    thisFactory.one.view = one.view

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
        spajs.openURL(spajs.urlInfo.data.reg.baseURL());  
    }) 
         
    return def;  
}

function renderErrorAsPage(error)
{       
    return spajs.just.render('error_as_page', {error:error, opt: {}});
}
