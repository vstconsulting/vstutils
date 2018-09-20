
var gui_action_object = { 
    
    exec : function (callback, error_callback)
    {
        var thisObj = this;
        var res = this.sendToApi(this.api.methodExec, callback, error_callback)
        $.when(res).done(function()
        {
            guiPopUp.success("Action "+thisObj.api.bulk_name+" was called successfully");
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