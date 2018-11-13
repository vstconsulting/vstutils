
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
        let promise = new $.Deferred();

        // select prefetch fields
        let prefetch_collector = selectPrefetchFieldsFromSchema(this.api.schema.get.fields);

        // if there are no prefetch fields, function returns data as it came from API
        // without any changes
        if($.isEmptyObject(prefetch_collector.fields))
        {
            return promise.resolve(data);
        }
        var dataFromApi = data.data;

        // select ids of prefetch fields
        selectIdsOfPrefetchFields(dataFromApi, prefetch_collector)

        // make bulk request
        let bulkArr = formBulkRequestForPrefetchFields(prefetch_collector);

        // send bulk request
        $.when(this.apiQuery(bulkArr)).done(d =>
        {
            addPrefetchInfoToDataFromApi(d, dataFromApi, prefetch_collector);

            promise.resolve(data);
        }).fail(f => {
            promise.reject(f);
        })

        return promise.promise();

    },

    updateFromServer : function ()
    {
        let res = this.load(this.model.filters)

        $.when(res).done(() =>
        {
            for(let i in this.model.guiFields)
            {
                this.model.guiFields[i].updateValue(this.model.data[i], this.model.data)
            }

            this.onUpdateFromServer()
        })

        return res
    },

    onUpdateFromServer : function (){},

    load : function (filters)
    {
        this.model.filters =  $.extend(true, {}, this.url_vars, filters)
        if(typeof this.model.filters !== "object")
        {
            this.model.filters = {api_pk:this.model.filters}
        }

        var thisObj = this;
        var url = this.api.path
        if(this.model.filters)
        {
            for(let i in this.model.filters)
            {
                if(/^api_/.test(i))
                {
                    url = url.replace("{"+i.replace("api_", "")+"}", this.model.filters[i])
                }
            }
        }

        let q = {
            //type:'mod',
            data_type:url.replace(/^\/|\/$/g, "").split(/\//g),
            method:'get'
        }

        // var def = api.query(q)
        var def = this.apiQuery(q);

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
        var thisObj = this;

        if(this.model && this.model.data && this.api.parent)
        {
            window.guiListSelections.setSelection(this.api.parent.selectionTag, this.model.data.id)
        }
        var res = this.sendToApi('delete')
        $.when(res).done(function()
        {
            guiPopUp.success("Object of '"+thisObj.api.bulk_name+"' type was successfully deleted");
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

        if(this.api.autoupdate &&
            (
                !render_options  ||
                render_options.autoupdate === undefined ||
                render_options.autoupdate
            )
        )
        {
            this.startUpdates()
        }

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

        this.model.data = this.prepareDataBeforeRender();

        this.beforeRenderAsPage();

        tabSignal.emit("guiList.renderPage",  {guiObj:this, options: render_options, data:this.model.data});
        tabSignal.emit("guiList.renderPage."+this.api.bulk_name,  {guiObj:this, options: render_options, data:this.model.data});

        return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
    },

    beforeRenderAsPage: function()
    {
        let schema_name = '';
        if(this.api.schema.edit)
        {
            schema_name = 'edit';
        }
        else if(this.api.schema.get)
        {
            schema_name = 'get';
        }

        this.initAllFields(schema_name);
    },

    prepareDataBeforeRender: function()
    {
        return this.model.data;
    },
}
