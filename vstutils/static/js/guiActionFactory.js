
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