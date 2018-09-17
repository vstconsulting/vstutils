
var gui_page_object = { 
    load : function (filters)
    {
        if(typeof filters !== "object")
        {
            filters = {api_pk:filters}
        }

        var thisObj = this;


        var query = undefined;
         
        if(this.model.pathInfo && this.model.pathInfo.get && this.model.pathInfo.get.operationId)
        {
            var operations = this.model.pathInfo.get.operationId.split("_");
            if(operations.length >= 3)
            {
                let pageInfo = this.getPageInfo()
                query = {
                    type: "mod",
                    item: operations[0],
                    data_type:pageInfo.page.replace(/^[A-z]+\/[0-9]+\//, ""),
                    method:"get"
                }

                for(var i in pageInfo)
                {
                    if(/^api_/.test(i))
                    {
                        query[i.replace(/api_/, "")] = pageInfo[i]
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
                    data_type:this.api.bulk_name,
                    method:"get",
                    pk:filters.parent_id
                }
            }
            else
            {
                query = {
                    type: "get",
                    item: this.api.bulk_name,
                    pk:filters.api_pk
                }
            }
        }

        var def = api.query(query)

        var promise = new $.Deferred();

        $.when(def).done(function(data){
            thisObj.model.data = data.data
            thisObj.model.status = data.status

            promise.resolve(data)
        }).fail(function(e){
            promise.reject(e)
        })

        return promise.promise();
    },

    init : function (page_options = {}, object)
    {
        if(object)
        {
            this.model.data = object
            this.model.status = 200
        }
 
        if(!this.model.title)
        {
            this.model.title = this.api.bulk_name
        }
    },

    create : function ()
    {
        var thisObj = this;
        var res = this.sendToApi("add")
        $.when(res).done(function()
        {
            guiPopUp.success("New object in "+thisObj.api.bulk_name+" was successfully created");
        })
        return res;
    },

    update : function ()
    {
        var thisObj = this;
        var res = this.sendToApi("set")
        $.when(res).done(function()
        {
            guiPopUp.success("Changes in "+thisObj.api.bulk_name+" were successfully saved");
        })
        return res;
    },

    sendToApi : function (method)
    {
        var def = new $.Deferred();
        var data = {}
        method = method.toLowerCase()

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

            //data = this.validateByModel(data)

            var query = {
                type: method,
                item: this.api.bulk_name,
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

                if(method == 'set' && this.model.pathInfo.post && this.model.pathInfo.post.operationId
                    && this.model.pathInfo.patch === undefined
                    && this.model.pathInfo.put === undefined)
                {
                    operations = this.model.pathInfo.post.operationId.split("_");
                    query_method = "post"
                }

                if(operations.length >= 3)
                {
                    let pageInfo = this.getPageInfo()
                    query = {
                        type: "mod",
                        item: operations[0],
                        data_type: pageInfo.page.replace(/^[A-z]+\/[0-9]+\//, ""),
                        data:data,
                        method:query_method
                    }

                    query.pk = pageInfo['api_pk']
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
    },

    delete : function ()
    {
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

            let pageInfo = this.getPageInfo()
            var thisObj = this;
            var current_url = pageInfo.page_and_parents;
            var query ={};
            if ((current_url.match(/\//g) || []).length > 1) 
            {
                var re = /(?<parent>\w+(?=\/))\/(?<pk>\d+(?=\/))\/(?<suburl>.*)/g;
                let result = re.exec(current_url)
                query = {
                    type: "mod",
                    item: result.groups.parent,
                    data: {},
                    pk: result.groups.pk,
                    data_type: result.groups.suburl,
                    method: "DELETE"
                }
            }
            else 
            {
                query = {
                    type: "del",
                    item: this.api.bulk_name,
                    pk:this.model.data.id
                }
            }

            $.when(api.query(query)).done(function (data)
            {
                guiPopUp.success(""+thisObj.api.bulk_name+" were successfully deleted");
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
    },

    /**
     * Функция должна вернуть или html код блока или должа пообещать что вернёт html код блока позже
     * @returns {string|promise}
     */
    renderAsPage : function (render_options = {})
    {
        let tpl = this.getTemplateName('one')

        render_options.fields = this.api.schema.fields
        //render_options.sections = this.getSections('renderAsPage')
        if(!render_options.page_type) render_options.page_type = 'one'

        render_options.base_path = getUrlBasePath() 
        return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
    },

    /**
     * Функция должна вернуть или html код блока или должа пообещать что вернёт html код блока позже
     * @returns {string|promise}
     */
    renderAsNewPage : function (render_options = {})
    {
        let tpl = this.getTemplateName('new')

        render_options.fields = this.api.schema.fields
        //render_options.sections = this.getSections('renderAsNewPage')
        render_options.hideReadOnly = true

        render_options.base_path = getUrlBasePath()
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

        render_options.fields = this.api.schema.fields
        //render_options.sections = this.getSections('render')
        //debugger;
        return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
    },

}
