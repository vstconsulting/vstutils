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
            element_name.push(new window["api" + result[i].type].one())
            arr.push(element_name[element_name.length - 1].load(result[i].id))
        }
    }

    return spajs.just.onInsert('<ol class="breadcrumb">\n</ol>', () => {
        $.when.apply($, arr).done(function()
        {
            var arr_obj = []
            for (var i = 0; i < element_name.length; i++) {
                arr_obj.push({
                    url: element_name[i].model.data.url,
                    name: element_name[i].model.data[window["api" + element_name[i].model.page_name].getObjectNameFiled()]
                })
            }
            html = spajs.just.render("page_breadcrumb", {arr: arr_obj})
            $(".breadcrumb").insertTpl(html)
        })

    })
}