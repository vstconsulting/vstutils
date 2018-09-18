
var gui_page_object = { 
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
