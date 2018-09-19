 
var webGui = {

}

if(window.moment && window.moment.tz)
{
    window.moment.tz.setDefault(window.timeZone);
}

webGui.opt = {}
webGui.opt.holder = undefined
webGui.opt.host = window.hostname

webGui.model = {}

webGui.model.nowTime = 0;

webGui.start = function(options)
{
    for(var i in options)
    {
        if(webGui.opt[i] && typeof(webGui.opt[i]) == "object")
        {
            for(var j in options[i])
            {
                webGui.opt[i][j] = options[i][j]
            }
        }
        webGui.opt[i] = options[i]
    }

    spajs.init({
        holder: webGui.opt.holder,
        menu_url: undefined,
        useHistoryApi:true
    })

    //spajs.ajax.setHeader("Authorization", "");
    spajs.ajax.setHeader(window.csrf_data.csrfHeaderName, window.csrf_data.token);

    setInterval(function()
    {
        var t = new Date();
        webGui.model.nowTime = t.getTime();
    }, 5001)


    $("body").touchwipe({
        wipingLeftEnd: function(e)
        {
            if(e.isFull && Math.abs(e.dx) >  Math.abs(e.dy))
            {
                $('body').removeClass('sidebar-open');
            }
        },
        wipingRightEnd:  function(e)
        {
            if(e.isFull && Math.abs(e.dx) >  Math.abs(e.dy))
            {
                $('body').addClass('sidebar-open');
            }
        },
        min_move_x: 120,
        min_move_y: 120,
        preventDefaultEvents: false
    });

    if(window.cordova || ( window.parent && window.parent.cordova))
    {
        $("body").addClass('platform-cordova')
    }
    else
    {
        $("body").addClass('platform-web')
    }

    tabSignal.emit("webGui.start")

    try{
        spajs.openMenuFromUrl(undefined, {withoutFailPage:window.location.pathname != "/"})
    }
    catch (exception)
    {
        if(exception.code == 404)
        {
            return;
        }
        
        console.error("spajs.openMenuFromUrl exception", exception.stack)
        debugger; 
    }
}

webGui.showErrors = function(res)
{
    for(let i in res)
    {
        if(i == "detail")
        {
            console.error('showErrors:' + res[i])
            guiPopUp.error(res[i])
            return res[i];
        }
        else if(typeof res[i] === "object")
        {
            let error = webGui.showErrors(res[i])
            if (error)
            {
                return error;
            }

        }
    }
}

spajs.errorPage = function(holder, menuInfo, data, error_data)
{  
    var error = {
        error_data:error_data
    }

    error.status = "520"
    if(error_data.status)
    {
        error.status = error_data.status
    }

    if(error_data.responseJSON)
    {
        error_data = error_data.responseJSON
    }

    error.text = "Unknown error";
    error.title = "Error"
    if(error_data == undefined){
        error.title = "Unknown error"
    }
    else
    {
        if(error_data.detail && error_data.detail.toString)
        {
            error.text = error_data.detail.toString()
        }
    }

    $(holder).insertTpl(spajs.just.render("errorPage", {error:error, data:data, menuInfo:menuInfo}))
}

tabSignal.connect("loading.completed", function()
{  
    webGui.start({
        is_superuser:window.is_superuser,
        holder:'#spajs-body'
    })

    hideLoadingProgress();
})

/*
tabSignal.connect("webGui.start", function()
{
    spajs.addMenu({
        id:"home",
        urlregexp:[/^(home|)$/],
        onOpen:function(holder, menuInfo, data){return guiServers.showList(holder, menuInfo, data);}
    })

})*/