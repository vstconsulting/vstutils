
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

            this.create = function (){ }
            this.update = function (){ }
            this.delete = function (){ }

            this.copy   = function (){ }

            /**
             * Функция должна вернуть или html код блока или должа пообещать чтол вернёт html код блока позже
             * @returns {string|promise}
             */
            this.render = function ()
            {
                var thisObj = this;
                var tpl = thisObj.view.bulk_name + '_one'
                if (!spajs.just.isTplExists(tpl))
                {
                    tpl = 'entity_one'
                }

                return spajs.just.render(tpl, {query: "", guiObj: thisObj, opt: {}});
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
             * @param {string|object} query запрос
             * @param {integer} limit
             * @param {integer} offset
             * @param {string} ordering - сортировка по какому-то свойству объекта(id, name и т.д). Для обратной сортировки передавать "-id"
             * @returns {jQuery.ajax|spajs.ajax.Call.defpromise|type|spajs.ajax.Call.opt|spajs.ajax.Call.spaAnonym$10|Boolean|undefined|spajs.ajax.Call.spaAnonym$9}
             */
            this.search = function (filters /*query, limit, offset, ordering*/)
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
            this.render = function ()
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
         * Выполняет переход на страницу с результатами поиска
         * @param {string} query
         * @returns {$.Deferred}
         */
        search:function(query)
        {
            if (this.isEmptySearchQuery(query))
            {
                alert("Не готово @todo ")
                return spajs.open({menuId: this.model.name, reopen: true});
            }
 
            if(!spajs.urlInfo || !spajs.urlInfo.data.reg.searchURL)
            {
                return;
            }
            
            return spajs.openURL(spajs.urlInfo.data.reg.searchURL(this.searchObjectToString(trim(query))));  
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

