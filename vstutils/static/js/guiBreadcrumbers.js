function renderBreadcrumbs()
{
    let current_url = window.location.hash.replace("#", "");

    let urls = [];
    let pages = current_url.split(/\//g);
    let url = window.location.href.replace(current_url, "");

    let last_name = undefined

    for(let i in pages)
    {
        url+= pages[i]+"/"
        let url_id = "url_breadcrumb_"+i

        if(last_name &&  window["api" + last_name] != undefined && /^[0-9]+$/.test(pages[i]) )
        {
            let obj  = new window["api" + last_name].one();
            $.when(obj.load(pages[i]/1)).done(function(url_id, obj){
                return function(){
                    $("#"+url_id).html(obj.model.data[obj.parent.getObjectNameField()]);
                }
            }(url_id, obj))
        }

        urls.push("<a href='"+url.replace(/\/$/, "")+"' onclick='return vstGO(this.href);' id='"+url_id+"' > "+pages[i]+"</a>");

        last_name = pages[i]
    }

    return spajs.just.render("page_breadcrumb", {urls: urls})
}

function getUpLink(link)
{
    if(!window.location.hash.length)
    {
        return window.location.origin
    }

    if(!link)
    {
        link = window.location.hash.slice(1)
    }

    if(link.indexOf("/") == -1)
    {
        return vstMakeLocalUrl("")
    }

    link = link.replace(/\/[^\/]+$/, "").replace(/([0-9]+),[,0-9]+/g, "$1");

    // If menu_url is not set then use the first question mark in the address bar
    if(window.location.href.indexOf("?") != -1)
    {
        menuId = window.location.href.slice(window.location.href.indexOf("?")+1)
    }
    else
    {
        // If menu_url is not set then use window.location.hash
        menuId = window.location.hash.slice(1)
    }


    if(!spajs.findMenu(link))
    {
        return getUpLink(link);
    }

    return vstMakeLocalUrl(link)
}
