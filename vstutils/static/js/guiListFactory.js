
var gui_list_object = {
    state : {
        search_filters:{}
    }, 
    init : function (page_options, objects)
    {
        this.base_init.apply(this, arguments)
        
        if(objects)
        {
            this.model.data = objects
            this.model.status = 200
        }

        if(!this.model.title)
        {
            this.model.title = this.name
        } 
    },
  
    deleteArray : function (ids)
    {
        var thisObj = this;
        var def = new $.Deferred();
 
        var q = []
        for(let i in ids)
        {
            q.push({
                type:"del",
                item: thisObj.api.bulk_name,
                pk:ids[i]
            })
        }


        $.when(api.query(q)).done(function(data)
        {
            guiPopUp.success("Objects of '"+thisObj.api.bulk_name+"' type were successfully deleted");
            def.resolve(data)
        }).fail(function (e)
        {
            def.reject(e)
            webGui.showErrors(e)
        })

        return def.promise();
    },

    /**
     * Функция поиска
     * @returns {jQuery.ajax|spajs.ajax.Call.defpromise|type|spajs.ajax.Call.opt|spajs.ajax.Call.spaAnonym$10|Boolean|undefined|spajs.ajax.Call.spaAnonym$9}
     */
    search : function (filters)
    {
        var thisObj = this;
        this.model.filters = filters

        var def = this.load(filters)
        $.when(def).done(function(data){
            thisObj.model.data = data.data
        })

        return def
    },

    loadAllItems : function()
    {
        return this.search({limit:9999, offset:0});
    },

    prefetch : function (data)
    { 
        var prefetch_fields = {};
        var prefetch_fields_ids = {};
        var promise = new $.Deferred();

        //отбираем prefetch поля
        for(var i in this.api.schema.list.fields)
        {
            if(this.api.schema.list.fields[i].prefetch)
            {
                prefetch_fields[this.api.schema.list.fields[i].name] = $.extend(true, {}, this.api.schema.list.fields[i].prefetch);
                prefetch_fields_ids[this.api.schema.list.fields[i].name] = {};
            }
        }

        //если prefetch полей не оказалось, то функция завершает свое выполнение
        if($.isEmptyObject(prefetch_fields))
        {
            return promise.resolve(data);
        }

        var dataFromApi = data.data.results;

        //отбираем id prefetch полей
        for(var item in dataFromApi)
        {
            for(var field in dataFromApi[item])
            {
                if(prefetch_fields[field])
                {
                    if(!prefetch_fields_ids.hasOwnProperty(field))
                    {
                        prefetch_fields_ids[field] = {};
                    }

                    let path = prefetch_fields[field].path(dataFromApi[item]);

                    if(path)
                    {
                        if(!prefetch_fields_ids[field].hasOwnProperty(path))
                        {
                            prefetch_fields_ids[field][path] = [];
                        }

                        if($.inArray(dataFromApi[item][field], prefetch_fields_ids[field][path]) == -1 && dataFromApi[item][field] != null )
                        {
                            prefetch_fields_ids[field][path].push(dataFromApi[item][field]);
                        }
                    }
                }
            }
        }


        var bulkArr = [];
        var queryObj = {};

        //формируем bulk запрос
        for(var field in prefetch_fields_ids)
        {
            for(var path in prefetch_fields_ids[field])
            {

                let match = path.match(/(?<parent_type>[A-z]+)\/(?<parent_id>[0-9]+)\/(?<page_type>[A-z\/]+)$/);
                if(match != null)
                {
                    queryObj = {
                        type: "mod",
                        item: match[1],
                        pk: match[2],
                        data_type: match[3],
                        method: "get",
                    }
                }
                else
                {
                    let bulk_name = path.replace(/\{[A-z]+\}\/$/, "").toLowerCase().match(/\/([A-z0-9]+)\/$/);
                    queryObj = {
                        type: "mod",
                        item: bulk_name[1],
                        filters:"id="+prefetch_fields_ids[field][path].join(","),
                        method:"get",
                    }
                }

                bulkArr.push(queryObj);
            }
        }

        //отправляем bulk запрос
        $.when(api.query(bulkArr)).done(d =>
        {
            for(var item in dataFromApi)
            {
                for(var field in dataFromApi[item])
                {
                    if(prefetch_fields[field])
                    {
                        let path = prefetch_fields[field].path(dataFromApi[item]);

                        if(path)
                        {
                            let match = path.match(/(?<parent_type>[A-z]+)\/(?<parent_id>[0-9]+)\/(?<page_type>[A-z\/]+)$/);
                            if(match != null)
                            {
                                for(var j in d)
                                {
                                    if(d[j].item == match[1] && d[j].subitem == match[3])
                                    {
                                        let prefetch_data = d[j].data.results;
                                        for(var k in prefetch_data)
                                        {
                                            if($.inArray(prefetch_data[k].id, prefetch_fields_ids[field][path]) != -1)
                                            {
                                                dataFromApi[item][field+'_info'] = prefetch_data[k];
                                            }
                                        }
                                    }
                                }
                            }
                            else
                            {
                                let bulk_name = path.replace(/\{[A-z]+\}\/$/, "").toLowerCase().match(/\/([A-z0-9]+)\/$/);
                                for(var j in d)
                                {
                                    if(d[j].item == bulk_name[1])
                                    {
                                        let prefetch_data = d[j].data.results;
                                        for(var k in prefetch_data)
                                        {
                                            if(dataFromApi[item][field] == prefetch_data[k].id)
                                            {
                                                dataFromApi[item][field+'_info'] = prefetch_data[k];
                                            }
                                        }
                                    }
                                }

                            }
                        }
                    }
                }
            }

            promise.resolve(data);
        }).fail(f => {
            promise.reject(f);
        })

        return promise.promise();

    },

    /**
     * Функция загрузки данных
     * @returns {jQuery.ajax|spajs.ajax.Call.defpromise|type|spajs.ajax.Call.opt|spajs.ajax.Call.spaAnonym$10|Boolean|undefined|spajs.ajax.Call.spaAnonym$9}
     */
    load : function (filters)
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
                data_type:this.api.bulk_name,
                method:"get",
                pk:filters.parent_id
            }
        }
        else
        {
            queryObj = {
                type: "get",
                item: this.api.bulk_name,
                filters:q.join("&")
            }
        }

        var promise = new $.Deferred();
       
        $.when(api.query(queryObj)).done(d => {

            $.when(this.prefetch(d)).always(a => {
                promise.resolve(a);
            });

        }).fail(f => {
            promise.reject();
        })

        return promise.promise();
    },

    toggleSelectEachItem : function (tag, mode)
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
    },

    /**
     * Преобразует строку поиска в объект с параметрами для фильтрации
     * @param {string} query строка запроса
     * @param {string} defaultName имя параметра по умолчанию
     * @returns {pmItems.searchStringToObject.search} объект для поиска
     */
    searchStringToObject : function (query, defaultName)
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
    },

    create : function ()
    {
        var thisObj = this;
        var res = this.sendToApi(this.api.methodAdd)
        $.when(res).done(function()
        {
            guiPopUp.success("New object in "+thisObj.api.bulk_name+" was successfully created");
        })
        return res;
    },

    /**
     * Функция должна вернуть или html код блока или должа пообещать чтол вернёт html код блока позже
     * @returns {string|promise}
     */
    renderAsPage : function (render_options = {})
    {
        let tpl = this.getTemplateName('list')

        render_options.fields = this.api.schema.list.fields
        render_options.base_path = getUrlBasePath()
        
        //render_options.sections = this.getSections('renderAsPage')
        if(!render_options.page_type) render_options.page_type = 'list'

        render_options.selectionTag =  this.api.selectionTag
        window.guiListSelections.intTag(render_options.selectionTag)
 
        return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
    },

    /**
     * Функция должна вернуть или html код блока или должа пообещать что вернёт html код блока позже
     * @returns {string|promise}
     */
    renderAsNewPage : function (render_options = {})
    {
        let tpl = this.getTemplateName('new')

        render_options.fields = this.api.schema.new.fields
        //render_options.sections = this.getSections('renderAsNewPage')
        render_options.hideReadOnly = true
       
        render_options.base_path = getUrlBasePath()
        return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
    },

    /**
     * Функция должна вернуть или html код блока или должа пообещать чтол вернёт html код блока позже
     * @returns {string|promise}
     */
    renderAsAddSubItemsPage : function (render_options = {})
    {
        let tpl = this.getTemplateName('list_add_subitems')

        render_options.fields = this.api.schema.list.fields
        render_options.base_path = getUrlBasePath()
        //render_options.sections = this.getSections('renderAsAddSubItemsPage')

        render_options.selectionTag =  this.api.selectionTag+"_add"
        window.guiListSelections.intTag(render_options.selectionTag)
        
        
        render_options.base_path = getUrlBasePath()
        return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
    },
    
    ////////////////////////////////////////////////
    // pagination
    ////////////////////////////////////////////////

    paginationHtml : function ()
    {
        var list = this.model.data

        // http://testserver/api/v2/host/?limit=20&offset=40&ordering=desc
        var limit = guiLocalSettings.get('page_size');
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
            limit = guiLocalSettings.get('page_size')
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
    },

    getTotalPages : function ()
    {
        var limit = guiLocalSettings.get('page_size')

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
    },

}
