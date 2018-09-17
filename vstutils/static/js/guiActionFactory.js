
var gui_action_object = { 
    init : function (page_options)
    {
        if(page_options)
        {
            this.model.pathInfo = page_options.api
            this.model.pageInfo = page_options.url

        } 
    },

    exec : function (callback, error_callback)
    {
        return this.sendToApi("PUT", callback, error_callback);
    },

    /** 
     * @todo Отрефакторить на единый код с sendToApi в других местах
     */
    sendToApi : function (method, callback, error_callback)
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

            /*let value = this.validateByModel(data)
            data = {}

            for(let i in value[0])
            {
                if(value[0][i] && value[0][i] != "")
                {
                    data[i] = value[0][i]
                }
            }*/ 

            if(!this.model.pathInfo)
            {
                console.error("pathInfo not define")
                guiPopUp.error("Error in code: pathInfo not define");
                def.reject()
                return def.promise();
            }

            var query_method = ""
            var operationId = "";

            if(this.model.pathInfo.post && this.model.pathInfo.post.operationId)
            {
                operationId = this.model.pathInfo.post.operationId
                query_method = "post"
            }

            if(this.model.pathInfo.put && this.model.pathInfo.put.operationId)
            {
                operationId = this.model.pathInfo.put.operationId
                query_method = "put"
            }

            if(this.model.pathInfo.patch && this.model.pathInfo.patch.operationId)
            {
                operationId = this.model.pathInfo.patch.operationId
                query_method = "patch"
            }

            operationId = operationId.replace(/(set)_([A-z0-9]+)/g, "$1-$2")

            var operations = []
            operations = operationId.split("_");
            for(let i in operations)
            {
                operations[i] = operations[i].replace("-", "_")
            }

            var query = []
            var url = this.model.pathInfo.api_path
            if(this.model.pageInfo)
            {
                for(let i in this.model.pageInfo)
                {
                    if(/^api_/.test(i))
                    {
                        url = url.replace("{"+i.replace("api_", "")+"}", this.model.pageInfo[i])
                    }
                }

                // Модификация на то если у нас мультиоперация
                for(let i in this.model.pageInfo)
                {
                    if(/^api_/.test(i))
                    {
                        if(this.model.pageInfo[i].indexOf(",") != -1)
                        {
                            let ids = this.model.pageInfo[i].split(",")
                            for(let j in ids)
                            {
                                query.push(url.replace(this.model.pageInfo[i], ids[j]))
                            }

                            continue;
                        }
                    }
                }
            }

            if(query.length == 0)
            {
                // Модификация на то если у нас не мультиоперация
                query = [url]
            }

            query.forEach(qurl => {

                qurl = qurl.replace(/^\/|\/$/g, "").split(/\//g)
                let q = {
                    type:'mod',
                    data_type:qurl,
                    data:data,
                    method:query_method
                }

                $.when(api.query(q)).done(data => 
                {
                    if(callback)
                    {
                        if(callback(data) === false)
                        {
                            return;
                        }
                    }

                    if(data.not_found > 0)
                    {
                        guiPopUp.error("Item not found");
                        def.reject({text:"Item not found", status:404})
                        return;
                    }

                    guiPopUp.success("Save");
                    def.resolve()
                }).fail(e => { 
                    if(callback)
                    {
                        if(error_callback(e) === false)
                        {
                            return;
                        }
                    }

                    polemarch.showErrors(e.responseJSON)
                    def.reject(e)
                }) 
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

    renderAsPage : function (render_options = {})
    {
        let tpl = this.getTemplateName('action_page_'+this.model.name, 'action_page')

        render_options.fields = this.api.schema.fields
        //render_options.sections = this.getSections('renderAsPage')
        if(!render_options.page_type) render_options.page_type = 'action'

        render_options.base_path = getUrlBasePath()
        return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
    },
 
} 