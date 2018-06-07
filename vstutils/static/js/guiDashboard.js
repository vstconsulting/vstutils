var guiDashboard = {
    model:{
        name:"module"
    }
}

guiDashboard.model.className = "guiDashboard"

guiDashboard.open  = function(holder, menuInfo, data)
{ 
    $(holder).insertTpl(spajs.just.render('dashboard_page', {}))
}

tabSignal.connect("webGui.start", function()
{
    spajs.addMenu({
        id:"home",
        urlregexp:[/^home$/],
        onOpen:function(holder, menuInfo, data){return guiDashboard.open(holder, menuInfo, data);},
        onClose:function(){ },
    })

    if(window.location.pathname == "/")
    {
        spajs.addMenu({
            id:"home_empty",
            urlregexp:[/^$/],
            onOpen:function(holder, menuInfo, data){return guiDashboard.open(holder, menuInfo, data);},
            onClose:function(){ },
        })
    }
})