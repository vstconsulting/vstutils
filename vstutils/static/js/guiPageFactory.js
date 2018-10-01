
var gui_page_object = {

    getTitle : function()
    {
        if(this.model.data)
        {
            for(let i in this.model.data)
            {
                if(typeof this.model.data[i] == "string")
                {
                    return this.model.data[i]
                }
            }
        }
        
        return this.api.name
    },

    prefetch : function (data)
    {
        var prefetch_fields = {};
        var prefetch_fields_ids = {};
        var promise = new $.Deferred();

        //отбираем prefetch поля
        for(var i in this.api.schema.get.fields)
        {
            if(this.api.schema.get.fields[i].prefetch)
            {
                prefetch_fields[this.api.schema.get.fields[i].name] = $.extend(true, {}, this.api.schema.get.fields[i].prefetch);
                prefetch_fields_ids[this.api.schema.get.fields[i].name] = {};
            }
        }

        //если prefetch полей не оказалось, то функция завершает свое выполнение
        if($.isEmptyObject(prefetch_fields))
        {
            return promise.resolve(data);
        }


        var dataFromApi = data.data;

        //отбираем id prefetch полей
        for(var field in dataFromApi)
        {
            if(prefetch_fields[field])
            {
                if(!prefetch_fields_ids.hasOwnProperty(field))
                {
                    prefetch_fields_ids[field] = {};
                }

                let path = prefetch_fields[field].path(dataFromApi);

                if(path)
                {
                    if(!prefetch_fields_ids[field].hasOwnProperty(path))
                    {
                        prefetch_fields_ids[field][path] = [];
                    }

                    if($.inArray(dataFromApi[field], prefetch_fields_ids[field][path]) == -1 && dataFromApi[field] != null )
                    {
                        prefetch_fields_ids[field][path].push(dataFromApi[field]);
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
                        item: match[1].replace(/^\/|\/$/g, ''),
                        pk: match[2].replace(/^\/|\/$/g, ''),
                        data_type: match[3].replace(/^\/|\/$/g, ''),
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
            for(var field in dataFromApi)
            {
                if(prefetch_fields[field])
                {
                    let path = prefetch_fields[field].path(dataFromApi);
                    if(path)
                    {
                        let match = path.match(/(?<parent_type>[A-z]+)\/(?<parent_id>[0-9]+)\/(?<page_type>[A-z\/]+)$/);
                        if(match != null)
                        {
                            for(var j in d)
                            {
                                if(d[j].item == match[1].replace(/^\/|\/$/g, '') && d[j].subitem == match[3].replace(/^\/|\/$/g, ''))
                                {
                                    let prefetch_data = d[j].data.results;
                                    for(var k in prefetch_data)
                                    {
                                        if($.inArray(prefetch_data[k].id, prefetch_fields_ids[field][path]) != -1)
                                        {
                                            dataFromApi[field+'_info'] = prefetch_data[k];
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
                                        if(dataFromApi[field] == prefetch_data[k].id)
                                        {
                                            dataFromApi[field+'_info'] = prefetch_data[k];
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

    load : function (filters)
    {
        if(typeof filters !== "object")
        {
            filters = {api_pk:filters}
        }

        var thisObj = this;
        var url = this.api.path
        if(this.url_vars)
        {
            for(let i in this.url_vars)
            {
                if(/^api_/.test(i))
                {
                    url = url.replace("{"+i.replace("api_", "")+"}", this.url_vars[i])
                }
            }
        }

        let q = {
            //type:'mod',
            data_type:url.replace(/^\/|\/$/g, "").split(/\//g),
            method:'get'
        }

        var def = api.query(q)

        var promise = new $.Deferred();

        $.when(def).done(data => {

            $.when(this.prefetch(data)).always(a => {
                thisObj.model.data = a.data
                thisObj.model.status = a.status
                promise.resolve(a);
            });

        }).fail(e => {
            promise.reject(e)
        })

        return promise.promise();
    },

    init : function (page_options = {}, url_vars = undefined, object_data = undefined)
    {
        this.base_init.apply(this, arguments)
        if(object_data)
        { 
            this.model.data = object_data
            this.model.status = 200
            
            this.model.title += " #" + this.model.data.id
            
            if(this.api.name_field && this.model.data[this.api.name_field])
            {
                this.model.title = this.model.data[this.api.name_field]
            }
        }
    },

    update : function ()
    {
        var thisObj = this;
        var res = this.sendToApi(this.api.methodEdit)
        $.when(res).done(function()
        {
            guiPopUp.success("Changes in "+thisObj.api.bulk_name+" were successfully saved");
        })
        return res;
    },

    delete : function ()
    {
        debugger;
        var thisObj = this;
        var res = this.sendToApi(this.api.methodDelete)
        $.when(res).done(function()
        {
            guiPopUp.success("Changes in "+thisObj.api.bulk_name+" were successfully deleted");
        })
        return res;

    },

    /**
     * Функция должна вернуть или html код блока или должа пообещать что вернёт html код блока позже
     * @returns {string|promise}
     */
    renderAsPage : function (render_options = {})
    {
        let tpl = this.getTemplateName('one')

        render_options.fields = []
        if(this.api.schema.edit)
        {
            render_options.fields = this.api.schema.edit.fields
        }
        else if(this.api.schema.get)
        {
            render_options.fields = this.api.schema.get.fields
        }
        //render_options.sections = this.getSections('renderAsPage')
        if(!render_options.page_type) render_options.page_type = 'one'

        render_options.base_path = getUrlBasePath()
        
        render_options.links = this.api.links
        render_options.actions = this.api.actions
        
        tabSignal.emit("guiList.renderPage",  {guiObj:this, options: render_options, data:this.model.data});
        tabSignal.emit("guiList.renderPage."+this.api.bulk_name,  {guiObj:this, options: render_options, data:this.model.data});
        
        return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
    },

    /**
     * Отрисует объект как поле ввода
     * Функция должна вернуть или html код блока или должа пообещать что вернёт html код блока позже
     * @returns {string|promise}
     */
    render : function (render_options = {})
    {
        let tpl = this.getTemplateName('one_as_field')

        debugger;
        if(render_options.hideReadOnly)
        {
            return "";
        }

        render_options.fields = this.api.schema.get.fields
        //render_options.sections = this.getSections('render')
        //debugger;
        return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
    },

}
