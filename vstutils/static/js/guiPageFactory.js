
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
        this.base_init.apply(this, arguments)
        if(object)
        {
            debugger;
            this.model.data = object
            this.model.status = 200
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

        render_options.fields = this.api.schema.edit.fields
        //render_options.sections = this.getSections('renderAsPage')
        if(!render_options.page_type) render_options.page_type = 'one'

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

        render_options.fields = this.api.schema.get.fields
        //render_options.sections = this.getSections('render')
        //debugger;
        return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
    },

}
