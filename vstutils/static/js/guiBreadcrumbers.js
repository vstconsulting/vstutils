function renderBreadcrumbs(){
    let current_url = spajs.urlInfo.data.reg.page_and_parents
    let re = /(?<type>[A-z0-9]+)\/(?<id>[0-9]+)/gm
    let result = []
    let tmp;
    while ((tmp = re.exec(current_url)) != null){
        let tmp_obj = {};
        tmp_obj.type = tmp.groups.type;
        tmp_obj.id = tmp.groups.id;
        result.push(tmp_obj);
    };
    let arr = []
    let element_name = []
    for (var i = 0; i < result.length; i++) {
        if (window["api" + result[i].type] == undefined)
        {
            element_name.push(result[i].type)
        } else {
            let obj  = new window["api" + result[i].type].one(spajs.urlInfo.data.reg.getApiPath());
            element_name.push(obj)
            arr.push(obj.load(result[i].id))
        }
    }


    var def = new $.Deferred();

    $.when.apply($, arr).done(function()
    { 

        var arr_obj = []
        var cur_url = []
        for (var i = 0; i < (element_name.length * 2); i++) {
            if ((i % 2) == 1) {
                cur_url.push(element_name[Math.floor(i/2)].model.data.id)
                let element_data = element_name[Math.floor(i/2)].model.data
                let model_name = element_name[Math.floor(i/2)]
                let cur_name = element_data[model_name.parent.getObjectNameFiled()]
                arr_obj.push({
                    url: hostname + "/?" + cur_url.join("/"),
                    name: cur_name
                })
            } else {
                cur_url.push(element_name[Math.floor(i/2)].model.page_name)
                arr_obj.push({
                    url: hostname + "/?" + cur_url.join("/"),
                    name: element_name[Math.floor(i/2)].model.page_name
                })
            }
        } 

        def.resolve(spajs.just.render("page_breadcrumb", {arr: arr_obj}))
    }).fail(() => {
        def.reject()
    })

    return def.promise();
     
}