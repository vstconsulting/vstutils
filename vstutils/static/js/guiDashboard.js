var guiDashboard = {
    model:{
        name:"module"
    },
    api:{
        buttons:[],
        name:"Dashboard"
    },
    tpl_name : 'guiDashboard',
    getTitle:function(){ return this.api.name}
}

guiDashboard.model.className = "guiDashboard"

guiDashboard.open  = function(holder, menuInfo, data)
{
    $(holder).insertTpl(spajs.just.render(this.tpl_name, {guiObj:this}))
}

tabSignal.connect("webGui.start", function()
{
    spajs.addMenu({
        id:"home",
        urlregexp:[/^home$/, /^$/, /^\/$/],
        onOpen:function(holder, menuInfo, data){return guiDashboard.open(holder, menuInfo, data);},
        onClose:function(){ },
    })
})