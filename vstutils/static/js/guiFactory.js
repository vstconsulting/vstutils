
function getMenuIdFromApiPath(path){
    return path.replace(/[^A-z0-9\-]/img, "_")
}


function openApi_definitions(api)
{ 
    // Создали фабрику для всего
    for(var key in api.openapi.definitions)
    { 
        if(/^One/.test(key))
        {
            // Не формируем фабрики для объектов One...
            continue;
        }

        console.log("Фабрика", key);

        var one = api.openapi.definitions["One"+key]
        var list = api.openapi.definitions[key]

        if(!one)
        {
            one = list;
        }

        window["api"+key] = guiItemFactory(api, {
            bulk_name:key.toLowerCase(), 
            definition:list, 
        }, {
            bulk_name:key.toLowerCase(), 
            definition:one, 
        })

        // Событие в теле которого можно было бы переопределить поля фабрики сразу после её создания
        tabSignal.emit("openapi.factory."+key,  {factory: window["api"+key]});
         
    }
}

tabSignal.connect("openapi.factory.Group", function(data)
{
    data.factory.testData = "ABC";
    
})

tabSignal.connect("gui.new.group.list", function(data)
{ 
    data.model.buttons = [
        {
            class:'btn btn-primary',
            function:function(){ return "spajs.open({ menuId:'new-"+this.model.page_name+"'}); return false;"},
            title:'Create',
            link:function(){ return '/?new-'+this.model.page_name},
        },
    ]
    
    data.model.title = "Groups"
    data.model.short_title = "Groups"
    data.model.fileds =[
        {
            title:'Name',
            name:'name',
        },
    ]
    
    data.model.actions = [
        {
            function:function(item){ return 'spajs.showLoader('+this.model.className+'.deleteItem('+item.id+'));  return false;'},
            title:'Delete',
            link:function(){ return '#'}
        },
        {
            function:function(item){ return '';},
            title:function(item)
            {
                if(item.children)
                {
                    return 'Create sub group'
                }

                return 'Create sub host'
            },
            link:function(item)
            {
                if(item.children)
                {
                    return '/?group/'+item.id+'/new-group'
                }

                return '/?group/'+item.id+'/new-host'
            },
        },
    ]
})

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
         
         
         
         
        var paths = []
        window.gui_pages = []
        for(var i in window.api.openapi.paths)
        {
            var val = window.api.openapi.paths[i]
            lastval = val;
            lastkey = i;
            if(!val.get )
            {
                // это экшен
                continue;
            }

            // Определяем какой класс соответсвует урлу
            var pageMainBlockType;
            try{
                // Получаем класс по имени схемы из урла
                pageMainBlockType = val.post.responses[201].schema.$ref.match(/\/([A-z0-9]+)$/)
            }catch (exception) {
                try{
                    // Получаем класс по имени схемы из урла
                    pageMainBlockType = val.put.responses[201].schema.$ref.match(/\/([A-z0-9]+)$/)
                }catch (exception) {
                    try{
                        // Получаем класс по имени схемы из урла
                        pageMainBlockType = val.get.responses[200].schema.$ref.match(/\/([A-z0-9]+)$/)
                    }catch (exception) {
                        console.warn("Нет схемы у "+i)
                        //debugger;
                        continue;
                    }
                }
            }

            if(!pageMainBlockType || !pageMainBlockType[1])
            {
                debugger;
                continue;
            }

            // Получаем класс по имени
            var pageMainBlockObject= window["api" + pageMainBlockType[1] ]
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

            // Определяем регулярное выражения для соответсмвия урла и страницы
            var regexp = i
            regexp = regexp.replace(/^\//, "");
            regexp = regexp.replace(/\/$/, "");
            regexp = regexp.replace(/\//g, "\\/")
            regexp = regexp.replace(/\{([A-z0-9]+)\}/igm, "([A-z0-9]+)");
            regexp = "^"+regexp+"$"

            paths.push([i, regexp]);

            // Создали страницу
            var page = new guiPage();
            page.registerURL([new RegExp(regexp)], getMenuIdFromApiPath(i));
            
            // Уровень вложености меню (по идее там где 1 покажем в меню с лева)
            var urlLevel = (regexp.match(/\//g) || []).length
            
            // Определяем тип страницы из урла (список или один элемент)
            if(/\{[A-z_\-]+\}\/$/.test(i))
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
                            debugger;
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

                //debugger;
                //break;
            }
            else
            {
                // это список

                // Настроили страницу
                page.blocks.push({
                    id:'itemList',
                    level: urlLevel,  
                    prioritet:0,
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
            }
             
            window.gui_pages.push(page)
        }
        
        // Событие в теле которого можно было бы переопределить и дополнить список страниц
        tabSignal.emit("openapi.paths",  {api: window.api, paths:paths});
        console.table(paths);
  
  
  
        tabSignal.emit("openapi.completed",  {api: window.api});
        tabSignal.emit("loading.completed"); 
    })



})
 