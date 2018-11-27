/*
 * Registers 'profile' url and all profile sublinks' urls.
 */
tabSignal.connect("openapi.completed", function()
{
    let subLinksArr = ['actions', 'links'];

    let pathObj = guiSchema.path['/user/{pk}/'];

    for (let i in subLinksArr)
    {
        let sublink_type = subLinksArr[i];

        for (let j in pathObj[sublink_type])
        {
            let sublink = pathObj[sublink_type][j]

            if(sublink.type == 'action')
            {
                registerProfileSublinkAction(sublink.name, sublink.path, my_user_id);
            }
            else if(sublink.type == 'page')
            {
                registerProfileSublinkPage(sublink.name, sublink.path, my_user_id, sublink);
            }
            else if(sublink.type == 'list')
            {
                registerProfileSublinkList(sublink.name, sublink.path, my_user_id);
            }
        }
    }

    spajs.addMenu({
        id:"profile",
        urlregexp:[/^\/?profile$/],
        priority:0,
        onOpen:function(holder, menuInfo, data, onClose_promise)
        {
            let pageItem = new guiObjectFactory('/user/{pk}/', {
                page:'user/'+ my_user_id,
                api_pk:my_user_id
            })
            window.curentPageObject = pageItem // Нужен для работы тестов

            var def = new $.Deferred();
            $.when(pageItem.load(my_user_id)).done(function()
            {
                def.resolve(pageItem.renderAsPage())
            }).fail(function(err)
            {
                def.resolve(renderErrorAsPage(err));
            })

            $.when(onClose_promise).always(() => {
                pageItem.stopUpdates();
            })

            return def.promise();
        },
    })

    spajs.addMenu({
        id:"profile_edit",
        urlregexp:[/^\/?profile\/edit$/],
        priority:0,
        onOpen:function(holder, menuInfo, data, onClose_promise)
        {
            let pageItem = new guiObjectFactory('/user/{pk}/', {
                page:'user/'+ my_user_id,
                api_pk:my_user_id
            })
            window.curentPageObject = pageItem // Нужен для работы тестов

            var def = new $.Deferred();
            $.when(pageItem.load(my_user_id)).done(function()
            {
                def.resolve(pageItem.renderAsEditablePage())
            }).fail(function(err)
            {
                def.resolve(renderErrorAsPage(err));
            })

            $.when(onClose_promise).always(() => {
                pageItem.stopUpdates();
            })

            return def.promise();
        },
    })
})


/*
 * Registers Profile's sublink with Action Type
 * @param {sublink} - string - name of sublink
 * @param {path} - string - api_path
 * @param {api_pk} - integer - object's id
 * @returns {html}
 */
function registerProfileSublinkAction(sublink, path, api_pk)
{
    let reg_url = new RegExp('^\/?profile/' + sublink + '$');
    let url_id = 'profile_' + sublink.replace(/\/+/g,'_');

    spajs.addMenu({
        id:url_id,
        urlregexp:[reg_url],
        priority:0,
        onOpen:function(holder, menuInfo, data, onClose_promise)
        {
            let pageItem = new guiObjectFactory(path, {
                page:'user/'+ api_pk +'/' + sublink,
                api_pk:api_pk,
            })
            window.curentPageObject = pageItem // Нужен для работы тестов

            var def = new $.Deferred();
            $.when(pageItem).done(function()
            {
                def.resolve(pageItem.renderAsPage())
            }).fail(function(err)
            {
                def.resolve(renderErrorAsPage(err));
            })

            $.when(onClose_promise).always(() => {
                pageItem.stopUpdates();
            })

            return def.promise();
        },
    })
}


/*
 * Registers Profile's sublink with Page Type
 * @param {sublink} - string - name of sublink
 * @param {path} - string - api_path
 * @param {api_pk} - integer - object's id
 * @returns {deferred}
 */
function registerProfileSublinkPage(sublink, path, api_pk, api_obj)
{
    let reg_url = new RegExp('^\/?profile/' + sublink + '$');
    let url_id = 'profile_' + sublink.replace(/\/+/g,'_');

    spajs.addMenu({
        id:url_id,
        urlregexp:[reg_url],
        priority:0,
        onOpen:function(holder, menuInfo, data, onClose_promise)
        {
            let pageItem = new guiObjectFactory(path, {
                page: 'user/' + api_pk + '/' + sublink,
                api_pk:api_pk,
                baseURL:function(){
                    return "profile"
                }
            })
            window.curentPageObject = pageItem // Нужен для работы тестов

            var def = new $.Deferred();
            $.when(pageItem.load(api_pk)).done(function()
            {
                if(pageItem.api.canEditInView)
                {
                    def.resolve(pageItem.renderAsEditablePage())
                }
                else
                {
                    def.resolve(pageItem.renderAsPage())
                }

            }).fail(function(err)
            {
                def.resolve(renderErrorAsPage(err));
            })

            $.when(onClose_promise).always(() => {
                pageItem.stopUpdates();
            })

            return def.promise();
        },
    })

    if(api_obj.canEdit)
    {
        let regexp_edit = new RegExp('^\/?profile/' + sublink + '/edit$');

        spajs.addMenu({
            id:getMenuIdFromApiPath(url_id+"edit"),
            urlregexp:[regexp_edit],
            priority:0,
            onOpen:function(holder, menuInfo, data, onClose_promise)
            {
                let pageItem = new guiObjectFactory(path, {
                    page: 'user/' + api_pk + '/' + sublink,
                    api_pk:api_pk,
                    baseURL:function(){
                        return "profile/" + sublink
                    }
                })
                window.curentPageObject = pageItem // Нужен для работы тестов
                var def = new $.Deferred();
                $.when(pageItem.load(data.reg)).done(function()
                {
                    def.resolve(pageItem.renderAsEditablePage())
                }).fail(function(err)
                {
                    def.resolve(renderErrorAsPage(err));
                })

                $.when(onClose_promise).always(() => {
                    pageItem.stopUpdates();
                })

                return def.promise();
            },
        })
    }
}


/*
 * Registers Profile's sublink with List Type
 * @param {sublink} - string - name of sublink
 * @param {path} - string - api_path
 * @param {api_pk} - integer - object's id
 * @returns {deferred}
 */
function registerProfileSublinkList(sublink, path, api_pk)
{
    let reg_url = new RegExp('^\/?profile/' + sublink + '$');
    let url_id = 'profile_' + sublink.replace(/\/+/g,'_');

    spajs.addMenu({
        id:url_id,
        urlregexp:[reg_url],
        priority:0,
        onOpen:function(holder, menuInfo, data, onClose_promise)
        {
            let pageItem = new guiObjectFactory(path, {
                page: 'user/' + api_pk + '/' + sublink,
                api_pk:api_pk,
            })
            window.curentPageObject = pageItem // Нужен для работы тестов

            var def = new $.Deferred();
            $.when(pageItem.load()).done(function()
            {
                def.resolve(pageItem.renderAsPage())
            }).fail(function(err)
            {
                def.resolve(renderErrorAsPage(err));
            })

            $.when(onClose_promise).always(() => {
                pageItem.stopUpdates();
            })

            return def.promise();
        },
    })
}