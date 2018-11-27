
var gui_action_object = {

    exec : function (callback, error_callback)
    {
        var thisObj = this;
        var res = this.sendToApi(this.api.methodExec, callback, error_callback)
        $.when(res).done(function(data)
        {
            guiPopUp.success("Action "+thisObj.api.bulk_name+" was called successfully");
            let thisSchema = thisObj.api.schema.exec.responses[data.status].schema
            if (thisSchema && thisSchema.redirect_path) {
                let key_list = thisSchema.redirect_path.format_keys();
                let id_list = new Array;
                data.subitem.forEach((v, k) => {
                    if (!(k % 2)) {
                        let key = key_list[Math.floor(k/2)]
                        if (key)
                        {
                            id_list[key] = v;
                        }
                    }
                })

                let redirect_field = ""
                if (thisSchema.redirect_field)
                {
                    redirect_field = thisSchema.redirect_field.title ||  thisSchema.redirect_field || ""
                }
                let url = thisSchema.redirect_path.format(id_list) + (data.data[redirect_field.toLowerCase()] || "")
                vstGO(url);
            }
        }).fail(function(data){
            //thisObj.showErrors(data, 'exec')
        })
        return res;
    },

    renderAsPage : function (render_options = {})
    {
        let tpl = this.getTemplateName('action_page_'+this.model.name, 'action_page')

        render_options.fields = this.api.schema.exec.fields
        
        render_options.base_path = getUrlBasePath()

        this.beforeRenderAsPage();

        return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
    },

    beforeRenderAsPage: function()
    {
        this.initAllFields('exec');
    },

}