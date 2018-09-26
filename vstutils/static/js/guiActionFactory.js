
var gui_action_object = { 
    
    exec : function (callback, error_callback)
    {
        var thisObj = this;
        var res = this.sendToApi(this.api.methodExec, callback, error_callback)
        $.when(res).done(function(data)
        {
            guiPopUp.success("Action "+thisObj.api.bulk_name+" was called successfully");
            let thisSchema = thisObj.api.schema.exec.responses[data.status].schema
            if (thisSchema.redirect_path) {
                let key_list = thisSchema.redirect_path.format_keys();
                let id_list = new Array;
                data.subitem.forEach((v, k) => {
                    if (!k % 2) {
                        id_list[key_list[k % 2]] = v;
                    }
                })
                debugger;
                let url = thisSchema.redirect_path.format(id_list) + (data.data[thisSchema.redirect_field] || "")
                vstGO(url);
            }
        })
        return res; 
    },
 
    renderAsPage : function (render_options = {})
    {
        let tpl = this.getTemplateName('action_page_'+this.model.name, 'action_page')

        render_options.fields = this.api.schema.exec.fields
        //render_options.sections = this.getSections('renderAsPage')
        if(!render_options.page_type) render_options.page_type = 'action'
        
        render_options.base_path = getUrlBasePath()
        return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
    },
 
} 