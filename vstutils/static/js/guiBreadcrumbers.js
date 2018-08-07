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
            let obj  = new window["api" + result[i].type].one();
            element_name.push(obj)
            arr.push(obj.load(result[i].id))
        }
    }

    return spajs.just.onInsert('<ol class="breadcrumb">\n</ol>', () => {
        $.when.apply($, arr).done(function(test)
        {
            var arr_obj = []
            //var cur_url = hostname + "/?";
            var cur_url = []
            for (var i = 0; i < (element_name.length * 2); i++) {
                if ((i % 2) == 1) {
                    cur_url.push(element_name[Math.floor(i/2)].model.data.id)
                    arr_obj.push({
                        url: hostname + "/?" + cur_url.join("/"),
                        name: element_name[Math.floor(i/2)].model.data[window["api" + element_name[Math.floor(i/2)].model.page_name].getObjectNameFiled()]
                    })
                } else {
                    cur_url.push(element_name[Math.floor(i/2)].model.page_name)
                    arr_obj.push({
                        url: hostname + "/?" + cur_url.join("/"),
                        name: element_name[Math.floor(i/2)].model.page_name
                    })
                }
            }
            html = spajs.just.render("page_breadcrumb", {arr: arr_obj})
            $(".breadcrumb").insertTpl(html)
        })

    })
}