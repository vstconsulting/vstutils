
function getMenuIdFromApiPath(path){
    return path.replace(/[^A-z0-9\-]/img, "_")
}


function openApi_definitions(api)
{
    // Создали фабрику для всего
    for(var key in api.openapi.definitions)
    {
        var one;
        var list;
        
        if(window["api"+key])
        {
            continue;
        }

        if(/^One/.test(key))
        {
            one = api.openapi.definitions[key]
            list = api.openapi.definitions[key.replace(/^One/, "")] 
        }
        else
        {
            one = api.openapi.definitions["One"+key]
            list = api.openapi.definitions[key]  
        }
            

        console.log("Фабрика", key.replace(/^One/, ""));

        if(!one)
        {
            one = list;
        }
        
        if(!list)
        {
            list = one;
        }
        

        var list_fileds = []
        for(var i in list.properties)
        {
            if($.inArray(i, ['url', 'id']) != -1)
            {
                continue;
            }

            var val = list.properties[i]
            val.name = i


            list_fileds.push(val)
        }

        var one_fileds = []
        for(var i in one.properties)
        {
            if($.inArray(i, ['url', 'id']) != -1)
            {
                continue;
            }

            var val = one.properties[i]
            val.name = i


            one_fileds.push(val)
        }

        window["api"+key] = guiItemFactory(api, {
            view:{
                bulk_name:key.toLowerCase().replace(/^One/i, ""),
                definition:list,
            },
            model:{
                fileds:list_fileds,
                page_name:key.toLowerCase().replace(/^One/i, ""),
            }
        }, {
            view:{
                bulk_name:key.toLowerCase().replace(/^One/i, ""),
                definition:one,
            },
            model:{
                fileds:one_fileds,
                page_name:key.toLowerCase().replace(/^One/i, ""),
            }
        })

        /**
         *  Событие в теле которого можно было бы переопределить поля фабрики сразу после её создания
         *
         *  На пример такой код для объекта типа Group будет добавлять поле testData
         *   tabSignal.connect("openapi.factory.Group", function(data)
         *   {
         *      data.testData = "ABC";
         *   })
         */
        tabSignal.emit("openapi.factory."+key,  window["api"+key]);
    }
}

function openApi_paths(api)
{
    var paths = []
    for(var api_path in api.openapi.paths)
    {
        var val = api.openapi.paths[api_path]
        lastval = val;
        lastkey = api_path;
        if(!val.get )
        {
            // это экшен
            continue;
        }
 
        // Определяем какой класс соответсвует урлу
        var pageMainBlockType = api_path.replace(/\{[A-z]+\}\/$/, "").match(/\/([A-z0-9]+)\/$/)
         
        if(!pageMainBlockType || !pageMainBlockType[1])
        {
            debugger;
            continue;
        }

        // Получаем класс по имени
        var pageMainBlockObject= window["api" + pageMainBlockType[1][0].toUpperCase() + pageMainBlockType[1].substr(1) ]
        if(!pageMainBlockObject)
        {
            
            try{
                // Получаем класс по имени схемы из урла
                pageMainBlockType = val.get.responses[200].schema.$ref.match(/\/([A-z0-9]+)$/) 
            }
            catch (exception)
            {
                try{
                    // Получаем класс по имени схемы из урла 
                    pageMainBlockType = val.get.responses[200].schema.properties.results.items.$ref.match(/\/([A-z0-9]+)$/)
                }
                catch (exception)
                {
                    try
                    {
                        // Получаем класс по имени схемы из урла
                        pageMainBlockType = val.post.responses[201].schema.$ref.match(/\/([A-z0-9]+)$/)
                    }
                    catch (exception)
                    {
                        try
                        {
                            // Получаем класс по имени схемы из урла
                            pageMainBlockType = val.put.responses[201].schema.$ref.match(/\/([A-z0-9]+)$/)
                        }
                        catch (exception)
                        {
                            console.warn("Нет схемы у "+api_path)
                            //debugger;
                            continue;
                        }
                    }
                }
            }
            
            if(!pageMainBlockType || !pageMainBlockType[1])
            {
                debugger;
                continue;
            }
            
            pageMainBlockObject= window["api" + pageMainBlockType[1] ]
            if(!pageMainBlockObject)
            {
                // Получаем класс по имени
                pageMainBlockObject= window["api" + pageMainBlockType[1].replace(/^One/, "") ]
                if(!pageMainBlockObject)
                {
                    debugger;
                    continue;
                }
            }
        }

        var regexp_arr = [] 
        
        // Создали страницу
        var page = new guiPage();

        // Уровень вложености меню (по идее там где 1 покажем в меню с лева)
        var urlLevel = (api_path.match(/\//g) || []).length
        if(urlLevel > 3)
        {
           // console.log(urlLevel, api_path)
           // continue;
        }
        
        // Определяем тип страницы из урла (список или один элемент)
        // Один элемент заканчивается на его идентификатор
        if(/\{[A-z_\-]+\}\/$/.test(api_path))
        {
            // это один элемент

            // Настроили страницу
            page.blocks.push({
                id:'itemList',
                level: urlLevel,
                prioritet:0,
                render:function(pageMainBlockObject)
                {
                    return function(menuInfo, data)
                    {
                        var objId = data.reg[data.reg.length - 1]

                        // Создали список хостов
                        var pageItem = new pageMainBlockObject.one()

                        var def = new $.Deferred();
                        $.when(pageItem.load(objId)).done(function()
                        {
                            def.resolve(pageItem.render())
                        }).fail(function(err)
                        {
                            def.reject(err);
                        })

                        return def.promise();
                    }
                }(pageMainBlockObject)
            })

            // Страница элемента вложенного куда угодно
            var regexp_in_other = "^([A-z]+\\/[0-9]+\\/)*("+pageMainBlockObject.one.view.bulk_name+"\\/[0-9]+)$";
            regexp_arr.push(regexp_in_other)
            
            page.registerURL([new RegExp(regexp_in_other)], getMenuIdFromApiPath(api_path));
         
            //debugger;
            //break;
        }
        else
        {
            // это список
            var path_regexp = []
            
            // Поиск
            path_regexp.push("^(([A-z]+\\/[0-9]+\\/)*("+pageMainBlockObject.one.view.bulk_name+"))$");
            path_regexp.push("^(([A-z]+\\/[0-9]+\\/)*("+pageMainBlockObject.one.view.bulk_name+"))(\\/search\\/[A-z0-9 %\-.:,=]+)$");
            path_regexp.push("^(([A-z]+\\/[0-9]+\\/)*("+pageMainBlockObject.one.view.bulk_name+"))(\\/search\\/[A-z0-9 %\-.:,=]+\\/page\\/[0-9]+)$");
            path_regexp.push("^(([A-z]+\\/[0-9]+\\/)*("+pageMainBlockObject.one.view.bulk_name+"))(\\/page\\/[0-9]+)$");
            

            // Поля для поиска
            window.api.openapi.paths[api_path].parameters

            // Проверяем есть ли возможность создавать объекты
            if(window.api.openapi.paths[api_path].post)
            {
                // Значит добавим кнопку создать объект
                page.blocks.push({
                    id:'btn-create',
                    level: urlLevel,
                    prioritet:9,
                    render:function(pageMainBlockObject)
                    {
                        return function(menuInfo, data)
                        {
                            var link = "//"+window.location.host+"?"+data.reg[0]+"/new";
                            
                            var btn = new guiElements.button({
                                class:'btn btn-primary',
                                link: link,
                                title:'Create new '+pageMainBlockObject.one.view.bulk_name,
                                text:'Create',
                            })

                            var def = new $.Deferred();
                            def.resolve(btn.render())
                            return def.promise();
                        }
                    }(pageMainBlockObject)
                })

                // Если есть кнопка создать объект то надо зарегистрировать страницу создания объекта
                var new_page_url = "^([A-z]+\\/[0-9]+\\/)*("+pageMainBlockObject.one.view.bulk_name+"\\/new)$" 
                
                // Создали страницу
                var page_new = new guiPage();
                page_new.registerURL([new RegExp(new_page_url)], getMenuIdFromApiPath(api_path+"_new"));
                regexp_arr.push(new_page_url)

                // Настроили страницу
                page_new.blocks.push({
                    id:'newItem',
                    level: urlLevel + 1,
                    prioritet:10,
                    render:function(pageMainBlockObject)
                    {
                        return function(menuInfo, data)
                        {
                            var def = new $.Deferred();

                            var pageItem = new pageMainBlockObject.one()
                            def.resolve(pageItem.render())

                            return def.promise();
                        }
                    }(pageMainBlockObject)
                })
 
            }

            // Список Actions строить будем на основе данных об одной записи.
            // ....
            // ....
            // ....
            // ....



            // Настроили страницу
            page.blocks.push({
                id:'itemList',
                level: urlLevel,
                prioritet:10,
                render:function(pageMainBlockObject)
                {
                    return function(menuInfo, data)
                    {
                        var def = new $.Deferred();

                        // Создали список хостов
                        var pageItem = new pageMainBlockObject.list()

                        // Определили фильтр
                        // pageItem.search("name=abc", 10, 5, 'desc')
                        $.when(pageItem.search()).done(function()
                        {
                            def.resolve(pageItem.render())
                        }).fail(function(err)
                        {
                            def.reject(err);
                        })

                        return def.promise();
                    }
                }(pageMainBlockObject)
            })

            //debugger;
            //break;

            var path_real_regexp = []
            for(var i in path_regexp)
            {
                path_real_regexp.push(new RegExp(path_regexp[i]))
                regexp_arr.push(path_regexp[i])
            }
            
            page.registerURL(path_real_regexp, getMenuIdFromApiPath(api_path));
        }
 
        for(var i in regexp_arr)
        {
            if(i > 0)
            {
                paths.push({name:null, path:regexp_arr[i], level:urlLevel});
                continue;
            }
            
            paths.push({name:api_path, path:regexp_arr[i], level:urlLevel}); 
        }

    }

    console.table(paths, ['name', 'path'  /*, 'level'*/]);
}

var btnBlock = {
    render:function(opt){
        return spajs.just.render("one_button", opt);
    }
}

tabSignal.connect("resource.loaded", function()
{
    window.api = new guiApi()
    $.when(window.api.init()).done(function(){

        // Событие в теле которого можно было бы переопределить ответ от open api
        tabSignal.emit("openapi.loaded",  {api: window.api});

        openApi_definitions(window.api)

        /**
         * Событие в теле которого можно было бы переопределить отдельные методы для классов апи
         * tabSignal.connect("openapi.definitions", function()
            {
                // Переопределили метод render у фабрики хостов
               window.apiHost.one.render = function(){ alert("?!")}
            })
         */
        tabSignal.emit("openapi.definitions",  {api: window.api});

        openApi_paths(window.api);

        // Событие в теле которого можно было бы переопределить и дополнить список страниц
        tabSignal.emit("openapi.paths",  {api: window.api});

        tabSignal.emit("openapi.completed",  {api: window.api});
        tabSignal.emit("loading.completed");
    })
})
