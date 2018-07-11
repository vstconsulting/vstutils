
/**
 * Фабрика классов объектов
 * @returns {Object}
 */
function guiItemFactory(api, listView, oneView)
{
    var thisFactory = {
        /**
         * Фабрика объектов сущьности
         * @returns {guiItemFactory.guiForWebAnonym$5}
         */
        one:function(){

            /**
             * Описание полей из апи
             */
            this.view = oneView

            /**
             * @class guiApi
             */
            this.api = api

            this.model = {}

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
                    thisObj.model = data
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
                var def = new $.Deferred();
                $.when(this.load()).done(function()
                {
                    var tpl = thisObj.view.bulk_name + '_list'
                    if (!spajs.just.isTplExists(tpl))
                    {
                        tpl = 'entity_list'
                    }

                    def.resolve(spajs.just.render(tpl, {query: "", guiObj: thisObj, opt: {}}));
                }).fail(function(err)
                {
                    def.reject(err);
                })

                return def.promise();
            }
 
            var res = $.extend(this, thisFactory.one); 
            tabSignal.emit("gui.new."+this.view.bulk_name+".list", res); 
            return res;
        },
        /**
         * Фабрика объектов списка сущьностей
         * @returns {guiItemFactory.guiForWebAnonym$6}
         */
        list:function()
        {
            /**
             * Представление полученное из апи
             * 
             * Описание полей из апи
             * view = {
             *      bulk_name - имя в bulk запросе
             *      fileds - поля
             * }
             */
            this.view = listView

            this.state = {
                search_filters:{}
            }

            /**
             * Используется в шаблоне страницы
             */
            this.model = {
                buttons:[],
                fileds:[],
                data:undefined, // Данные самого объекта
                selectedItems:{}
            }

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
            this.search = function (query, limit, offset, ordering)
            {
                var thisObj = this;
                if (!limit)
                {
                    limit = 999;
                }

                if (!offset)
                {
                    offset = 0;
                }

                if (!ordering)
                {
                    ordering = "";
                }

                var q = [];

                q.push("limit=" + encodeURIComponent(limit))
                q.push("offset=" + encodeURIComponent(offset))
                q.push("ordering=" + encodeURIComponent(ordering))

                if(query)
                {
                    for (var i in query)
                    {
                        if (Array.isArray(query[i]))
                        {
                            for (var j in query[i])
                            {
                                query[i][j] = encodeURIComponent(query[i][j])
                            }
                            q.push(encodeURIComponent(i) + "=" + query[i].join(","))
                            continue;
                        }
                        q.push(encodeURIComponent(i) + "=" + encodeURIComponent(query[i]))
                    }
                }

                var def = api.query({
                    type: "get",
                    item: this.view.bulk_name,
                    filters:q.join("&")
                })

                $.when(def).done(function(data){
                    thisObj.model.data = data.data
                })

                return def;
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
            tabSignal.emit("gui.new."+this.view.bulk_name+".list", res); 
            return res;
        }
    }
    
    return thisFactory;
}

