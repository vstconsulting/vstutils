
basePageView = {

}
 
basePageView.renderAllFields = function(opt)
{
    let html = []
    for(let i in opt.fields)
    {
        html.push(this.renderField(opt.fields[i], opt))
    }

    let id =  getNewId();
    return JUST.onInsert('<div class="fields-block" id="'+id+'" >'+html.join("")+'</div>', () => {

        let fields = $('#'+id+" .gui-not-required")
        if(!this.view.hide_non_required || this.view.hide_non_required >= fields.length)
        {
            return;
        }

        fields.hide()
        $('#'+id).appendTpl(spajs.just.render('show_not_required_fields', {fields:fields, opt:opt}))
    })
}

/**
 * Отрисует поле при отрисовке объекта.
 * @param {object} field
 * @returns {html}
 */
basePageView.renderField = function(field, render_options)
{
    if(!this.model.guiFields[field.name])
    {
        if(field.schema && field.schema.$ref)
        {
            var obj = getObjectBySchema(field.schema.$ref)
        }
        else if(field.$ref)
        {
            var obj = getObjectBySchema(field.$ref)

        }
        else if(field.items !== undefined && field.items.$ref)
        {
            var obj = getObjectBySchema(field.items.$ref)
        }

        if(obj)
        {
            var field_value = undefined
            if(this.model.data)
            {
                field_value = this.model.data[field.name]
            }

            obj = new obj.one(undefined, field_value, this)

            this.model.guiFields[field.name] = obj
        }

        if(!this.model.guiFields[field.name])
        {
            var type = field.format

            if(!type && field.enum !== undefined)
            {
                type = 'enum'
            }

            if(!type)
            {
                type = field.type
            }

            if(!window.guiElements[type])
            {
                type = "string"
            }

            var field_value = undefined
            if(this.model.data)
            {
                field_value = this.model.data[field.name]
            }
            this.model.guiFields[field.name] = new window.guiElements[type](field, field_value, this)
        }

        // Добавление связи с зависимыми полями
        // if для хардкода на js
        if(field.dependsOn)
        {
            let thisField = this.model.guiFields[field.name]
            if(thisField.updateOptions)
            {
                for(let i in field.dependsOn)
                {
                    let parentField = this.model.guiFields[field.dependsOn[i]]
                    if(parentField && parentField.addOnChangeCallBack)
                    {
                        parentField.addOnChangeCallBack(function(){
                            thisField.updateOptions.apply(thisField, arguments);
                        })
                    }
                }
            }
        }

        // if для привязанных полей из api
        if(field.additionalProperties && field.additionalProperties.field)
        {
            let thisField = this.model.guiFields[field.name];
            let parentField = this.model.guiFields[field.additionalProperties.field];

            if(parentField && parentField.addOnChangeCallBack)
            {
                parentField.addOnChangeCallBack(function() {
                    thisField.updateOptions.apply(thisField, arguments);
                })
            }
        }

    }

    return this.model.guiFields[field.name].render($.extend({}, render_options))
}

/**
 * Получает значения всех полей из this.model.guiFields
 *
 * Если поле вернёт объект то этот объект будет смёржен с результирующим объектом,
 * таким образом одно поле может вернуть более одного зщначения в модель
 *
 * @returns {basePageView.getValue.obj}
 */
basePageView.getValue = function ()
{
    var obj = {}
    let count = 0;
    for(let i in this.model.guiFields)
    {
        let val = this.model.guiFields[i].getValidValue();
        if(val !== undefined)
        {
            obj[i] = val;
        }
        
        count++;
    }
    
    if(count == 1 && this.model.guiFields[0] )
    { 
        obj = obj[0]
    }
    
    return obj;
}

basePageView.getValidValue = function ()
{ 
    return this.getValue();
}

basePageItem = {}

basePageItem.getPageInfo = function ()
{
    if(this.model.pageInfo)
    {
        return this.model.pageInfo;
    }

    return spajs.urlInfo.data.reg
}

/**
 * Функция для удобства переопределения какие поля показывать для каких случаев
 * @param {type} type
 * @returns {guiItemFactory.model.fields}
 * @note На пример функция apihistory.list.getFieldsFor_renderAsPage будет примером переопределения
 */
basePageItem.getFields = function (type)
{
    if(this['getFieldsFor_'+type])
    {
        return this['getFieldsFor_'+type]()
    }
    return this.model.fields
}

guiBaseItemFactory = {}

guiBaseItemFactory.getShortestApiURL = function ()
{
    var url = {};
    var level = 100;
    for(var i in this.view.urls)
    {
        if(level >= this.view.urls[i].level)
        {
            level = this.view.urls[i].level
            url = this.view.urls[i]
        }
    }

    return url;
}


guiBaseItemFactory.getTemplateName = function (type, default_name)
{
    var tpl = this.getBulkName() + '_'+type
    if (!spajs.just.isTplExists(tpl))
    {
        if(default_name)
        {
            return default_name;
        }
        return 'entity_'+type
    }

    return tpl;
}


/**
 * Для добавления дополнительных блоков на страницу
 * @param {type} type
 * @param {type} section
 * @returns {undefined}
 */
guiBaseItemFactory.addSection = function (type, section)
{
    if(!this.view['sections_for_'+type])
    {
        this.view['sections_for_'+type] = []
    }

    this.view['sections_for_'+type].push(section)
}

guiBaseItemFactory.getSections = function (type)
{
    if(this.view['sections_for_'+type])
    {
        return this.view['sections_for_'+type]
    }

    if(this.view.sections)
    {
        return this.view.sections
    }

    return []
}

guiBaseItemFactory.getBulkName = function ()
{
    if(!this.model || !this.model.pathInfo)
    {
        return this.view.bulk_name;
    }

    if(this.model.pathInfo.bulk_name)
    {
        return this.model.pathInfo.bulk_name
    }

    if(this.model.pathInfo.api_path)
    {
        var name = this.model.pathInfo.api_path.replace(/\{[A-z]+\}\/$/, "").toLowerCase().match(/\/([A-z0-9]+)\/$/);
        this.model.pathInfo.bulk_name = name[1]
    }

    return name[1];
}

/*
 * Вернёт true если в апи на этом пити есть возможность отправить запросы создания или обновления
 * @returns {Boolean}
 */
guiBaseItemFactory.canUpdate = function ()
{
    if(!this.model.pathInfo)
    {
        return false;
    }

    if(this.model.pathInfo.post
        || this.model.pathInfo.put
        || this.model.pathInfo.patch)
    {
        return true;
    }

    return false;
}

guiBaseItemFactory.canDelete = function ()
{
    if(!this.model.pathInfo)
    {
        return false;
    }

    if(this.model.pathInfo.delete)
    {
        return true;
    }

    return false;
}

guiBaseItemFactory.actions = {}
guiBaseItemFactory.sublinks = {}
guiBaseItemFactory.title = ''

/**
 * Фабрика классов объектов
 * @returns {Object}
 */
function guiItemFactory(api, both_view, list, one)
{
    var thisFactory = {
        /**
         * Фабрика объектов сущьности
         * @param {Object} page_options параметры инициализации
         * @param {Object} object данные
         * @param {Object} parent_object родительский объект
         * @returns {guiItemFactory.guiForWebAnonym$5}
         *
         * @note init_options Могут по идее принимать определение параметров страницы из апи
         * Тогда в объект законным образом попадёт bulk_name и параметры фильтрации
         *
         */
        one:function(page_options, object, parent_object){

            /**
             * @class guiApi
             */
            this.api = api

            this.model = $.extend({}, one.model)
            this.model.pathInfo = undefined

            this.model.parent_object = parent_object
            this.model.guiFields = {}
            this.model.isSelected = {}
            this.model.buttons = []

            this.load = function (filters)
            {
                if(typeof filters !== "object")
                {
                    filters = {api_pk:filters}
                }

                var thisObj = this;


                var query = undefined;

                if(this.model.pathInfo && this.model.pathInfo.get && this.model.pathInfo.get.operationId)
                {
                    var operations = this.model.pathInfo.get.operationId.split("_");
                    if(operations.length >= 3)
                    {
                        let pageInfo = this.getPageInfo()
                        query = {
                            type: "mod",
                            item: operations[0],
                            data_type:pageInfo.page.replace(/^[A-z]+\/[0-9]+\//, ""),
                            method:"get"
                        }

                        for(var i in pageInfo)
                        {
                            if(/^api_/.test(i))
                            {
                                query[i.replace(/api_/, "")] = pageInfo[i]
                            }
                        }
                    }
                }

                if(!query)
                {
                    if(filters.parent_id && filters.parent_type)
                    {
                        query = {
                            type: "mod",
                            item: filters.parent_type,
                            data_type:this.getBulkName(),
                            method:"get",
                            pk:filters.parent_id
                        }
                    }
                    else
                    {
                        query = {
                            type: "get",
                            item: this.getBulkName(),
                            pk:filters.api_pk
                        }
                    }
                }

                var def = api.query(query)

                var promise = new $.Deferred();

                $.when(def).done(function(data){
                    thisObj.model.data = data.data
                    thisObj.model.status = data.status

                    promise.resolve(data)
                }).fail(function(e){
                    promise.reject(e)
                })

                return promise.promise();
            }

            this.init = function (page_options = {}, object)
            {
                if(object)
                {
                    this.model.data = object
                    this.model.status = 200
                }

                if(!page_options.api)
                {
                    this.model.pathInfo = this.getShortestApiURL().api
                }

                if(page_options.api)
                {
                    this.model.pathInfo = page_options.api
                }

                if(page_options.url)
                {
                    this.model.pageInfo = page_options.url
                }

                if(this.model.pathInfo)
                {
                    // Список Actions строить будем на основе данных api
                    this.model.sublinks = openApi_get_internal_links(this.api, this.model.pathInfo.api_path, 1);
                }

                if(!this.model.title)
                {
                    this.model.title = this.getBulkName();
                }
            }

            this.create = function ()
            {
                var thisObj = this;
                var res = this.sendToApi("add")
                $.when(res).done(function()
                {
                    guiPopUp.success("New object in "+thisObj.getBulkName()+" was successfully created");
                })
                return res;
            }

            this.update = function ()
            {
                var thisObj = this;
                var res = this.sendToApi("set")
                $.when(res).done(function()
                {
                    guiPopUp.success("Changes in "+thisObj.getBulkName()+" were successfully saved");
                })
                return res;
            }

            this.sendToApi = function (method)
            {
                var def = new $.Deferred();
                var data = {}
                method = method.toLowerCase()

                try{
                    data = this.getValue()
                    if (this['onBefore'+method])
                    {
                        data = this['onBefore'+method].apply(this, [data]);
                        if (data == undefined || data == false)
                        {
                            def.reject()
                            return def.promise();
                        }
                    }

                    //data = this.validateByModel(data)

                    var query = {
                        type: method,
                        item: this.getBulkName(),
                        data:data,
                    }

                    if(this.model.pathInfo)
                    {
                        var operations = []
                        var query_method = ""

                        if(method == 'add' && this.model.pathInfo.post && this.model.pathInfo.post.operationId)
                        {
                            operations = this.model.pathInfo.post.operationId.split("_");
                            query_method = "post"
                        }

                        if(method == 'set' && this.model.pathInfo.put && this.model.pathInfo.put.operationId)
                        {
                            operations = this.model.pathInfo.put.operationId.split("_");
                            query_method = "put"
                        }

                        if(method == 'set' && this.model.pathInfo.patch && this.model.pathInfo.patch.operationId)
                        {
                            operations = this.model.pathInfo.patch.operationId.split("_");
                            query_method = "patch"
                        }

                        if(method == 'set' && this.model.pathInfo.post && this.model.pathInfo.post.operationId
                            && this.model.pathInfo.patch === undefined
                            && this.model.pathInfo.put === undefined)
                        {
                            operations = this.model.pathInfo.post.operationId.split("_");
                            query_method = "post"
                        }

                        if(operations.length >= 3)
                        {
                            let pageInfo = this.getPageInfo()
                            query = {
                                type: "mod",
                                item: operations[0],
                                data_type: pageInfo.page.replace(/^[A-z]+\/[0-9]+\//, ""),
                                data:data,
                                method:query_method
                            }

                            query.pk = pageInfo['api_pk']
                        }
                    }

                    if(!query.pk && method == 'set')
                    {
                        query.pk = this.model.data.id
                    }
                    debugger;
                    $.when(api.query(query)).done(function (data)
                    {
                        def.resolve(data)
                    }).fail(function (e)
                    {
                        def.reject(e)
                        polemarch.showErrors(e.responseJSON)
                    })

                }catch (e) {
                    polemarch.showErrors(e)

                    def.reject()
                    if(e.error != 'validation')
                    {
                        throw e
                    }
                }

                return def.promise();
            }

            this.delete = function ()
            {
                var def = new $.Deferred();

                try{
                    if (this.onBeforeDelete)
                    {
                        if (!this.onBeforeDelete.apply(this, []))
                        {
                            def.reject()
                            return def.promise();
                        }
                    }

                    let pageInfo = this.getPageInfo()
                    var thisObj = this;
                    var current_url = pageInfo.page_and_parents;
                    var query ={};
                    if ((current_url.match(/\//g) || []).length > 1) 
                    {
                        var re = /(?<parent>\w+(?=\/))\/(?<pk>\d+(?=\/))\/(?<suburl>.*)/g;
                        let result = re.exec(current_url)
                        query = {
                            type: "mod",
                            item: result.groups.parent,
                            data: {},
                            pk: result.groups.pk,
                            data_type: result.groups.suburl,
                            method: "DELETE"
                        }
                    }
                    else 
                    {
                        query = {
                            type: "del",
                            item: this.getBulkName(),
                            pk:this.model.data.id
                        }
                    }
                    
                    $.when(api.query(query)).done(function (data)
                    {
                        guiPopUp.success(""+thisObj.getBulkName()+" were successfully deleted");
                        def.resolve(data)
                    }).fail(function (e)
                    {
                        def.reject(e)
                        polemarch.showErrors(e.responseJSON)
                    })
                }catch (e) {
                    polemarch.showErrors(e)
                    def.reject()
                    return def.promise();
                }

                return def.promise();
            }

            this.copy   = function ()
            {
                var def = new $.Deferred();
                var thisObj = this;

                $.when(this.load(this.model.data.id)).done(function ()
                {
                    var data = jQuery.extend(true, {}, thisObj.model.data);
                    delete data.id;
                    data.name = "copy from " + data.name

                    $.when(encryptedCopyModal.replace(data)).done(function (data)
                    {
                        spajs.ajax.Call({
                            url: hostname + "/api/v2/" + thisObj.model.page_name + "/",
                            type: "POST",
                            contentType: 'application/json',
                            data: JSON.stringify(data),
                            success: function (data)
                            {
                                def.resolve(data.id)
                            },
                            error: function (e)
                            {
                                def.reject(e)
                            }
                        });
                    }).fail(function (e)
                    {
                        def.reject(e)
                    })
                }).fail(function () {
                    def.reject(e)
                })

                return def.promise();
            }

            /**
             * Функция должна вернуть или html код блока или должа пообещать что вернёт html код блока позже
             * @returns {string|promise}
             */
            this.renderAsPage = function (render_options = {})
            {
                let tpl = this.getTemplateName('one')

                render_options.fields = this.getFields('renderAsPage')
                render_options.sections = this.getSections('renderAsPage')
                if(!render_options.page_type) render_options.page_type = 'one'

                return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
            }

            /**
             * Функция должна вернуть или html код блока или должа пообещать что вернёт html код блока позже
             * @returns {string|promise}
             */
            this.renderAsNewPage = function (render_options = {})
            {
                let tpl = this.getTemplateName('new')

                render_options.fields = this.getFields('renderAsNewPage')
                render_options.sections = this.getSections('renderAsNewPage')
                render_options.hideReadOnly = true

                return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
            }

            /**
             * Отрисует объект как поле ввода
             * Функция должна вернуть или html код блока или должа пообещать что вернёт html код блока позже
             * @returns {string|promise}
             */
            this.render = function (render_options = {})
            {
                let tpl = this.getTemplateName('one_as_field')

                if(render_options.hideReadOnly)
                {
                    return "";
                }

                render_options.fields = this.getFields('render')
                render_options.sections = this.getSections('render')
                //debugger;
                return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
            }

            // Если окажется что extend копирует оригинал а не назначает по ссылке то можно будет заменить для экономии памяти.
            var res = $.extend(this, basePageItem, basePageView, thisFactory.one);

            res.parent = thisFactory
            /**
             * Перегрузить поля объекта создаваемого фабрикой можно таким образом
             *
             tabSignal.connect("gui.new.group.list", function(data)
             {
                 // Тут код который будет модифицировать создаваемый объект
                 data.model.fields = [
                     {
                         title:'Name',
                         name:'name',
                     },
                 ]
             })
             */
            tabSignal.emit("gui.new."+this.getBulkName()+".one", res);

            res.init(page_options, object)

            return res;
        },
        /**
         * Фабрика объектов списка сущьностей
         * @returns {guiItemFactory.guiForWebAnonym$6}
         */
        list:function(page_options, objects, parent_object)
        {
            this.state = {
                search_filters:{}
            }

            /**
             * Используется в шаблоне страницы
             */
            this.model = $.extend({}, list.model)

            this.model.selectedItems = {}

            /**
             * @class guiApi
             */
            this.api = api
            this.model.parent_object = parent_object
            this.model.pathInfo = undefined
            this.model.sublinks = {}
            this.model.multi_actions = {}
            this.model.buttons = []

            /**
             * Переменная на основе пути к апи которая используется для группировки выделенных элементов списка
             * Чтоб выделение одного списка не смешивалось с выделением другого списка
             */
            this.model.selectionTag = "";

            this.init = function (page_options, objects)
            {
                let thisObj = this;
                if(!page_options)
                {
                    page_options = this.getShortestApiURL()
                }

                if(objects)
                {
                    this.model.data = objects
                    this.model.status = 200
                }

                if(page_options)
                {
                    this.model.pathInfo = page_options.api
                    this.model.pageInfo = page_options.url

                    if(page_options.selectionTag)
                    {
                        this.model.selectionTag = page_options.selectionTag
                    }
                }

                if(!this.model.title)
                {
                    this.model.title = this.getBulkName();
                }

                if(this.model.pathInfo)
                {
                    // Список Actions строить будем на основе данных api
                    this.model.sublinks = openApi_get_internal_links(this.api, this.model.pathInfo.api_path, 2);

                    if(!this.model.selectionTag)
                    {
                        this.model.selectionTag = this.model.pathInfo.api_path
                    }
                    // Тут надо обработать sublinks так чтоб добавить методы удалить объект и отделить страницы от экшенов поддерживающих мультиоперации
                    for(var i in this.model.sublinks)
                    {
                        if(!this.model.sublinks[i].isAction)
                        {
                            continue;
                        }
                        this.model.multi_actions[i] = this.model.sublinks[i]
                    }

                    this.model.multi_actions['delete'] = {
                        name:"delete",
                        onClick:function()
                        {
                            if(thisObj.getShortestApiURL().level == 2 && (thisObj.model.pathInfo.api_path.match(/\//g) || []).length > 2)
                            {
                                return questionDeleteOrRemove(thisObj);
                            }
                            else
                            {
                                return questionDeleteAllSelectedOrNot(thisObj);
                            }

                        }
                    }


                }

                window.guiListSelections.intTag(this.model.selectionTag)

            }

            this.getBtnNew = function ()
            {
                if(this.model.pathInfo.post && /_add$/.test(this.model.pathInfo.post.operationId))
                {
                    let link = window.hostname+"?"+this.model.pageInfo.page_and_parents+"/new";

                    let btn = new guiElements.link_button({
                        class:'btn btn-primary',
                        link: link,
                        title:'Create new '+this.getBulkName(),
                        text:'Create',
                    })

                    return btn.render()
                }
                return "";
            }
            this.getBtnAdd = function ()
            {
                if(this.getShortestApiURL().level == 2 && (this.model.pathInfo.api_path.match(/\//g) || []).length > 2)
                {
                    if(this.canUpdate())
                    {
                        var link = window.hostname+"?"+this.model.pageInfo.page_and_parents+"/add";

                        var btn = new guiElements.link_button({
                            class:'btn btn-primary',
                            link: link,
                            title:'Add '+this.getBulkName(),
                            text:'Add '+this.getBulkName(),
                        })
                        return btn.render()
                    }
                }
                return "";
            }

            this.deleteArray = function (ids)
            {
                debugger;
                var thisObj = this;
                var def = new $.Deferred();

                var q = []
                for(let i in ids)
                {
                    q.push({
                        type: "del",
                        item: this.getBulkName(),
                        pk:ids[i]
                    })
                }

                $.when(api.query(q)).done(function(data)
                {
                    guiPopUp.success(""+thisObj.getBulkName()+" were successfully deleted");
                    def.resolve(data)
                }).fail(function (e)
                {
                    def.reject(e)
                    polemarch.showErrors(e.responseJSON)
                })

                return def.promise();
            }

            /**
             * Функция поиска
             * @returns {jQuery.ajax|spajs.ajax.Call.defpromise|type|spajs.ajax.Call.opt|spajs.ajax.Call.spaAnonym$10|Boolean|undefined|spajs.ajax.Call.spaAnonym$9}
             */
            this.search = function (filters)
            {
                var thisObj = this;
                this.model.filters = filters

                var def = this.load(filters)
                $.when(def).done(function(data){
                    thisObj.model.data = data.data
                })

                return def
            }

            this.loadAllItems = function()
            {
                return this.search({limit:9999, offset:0});
            }

            this.prefetch = function (data)
            {
                var prefetch_fields = {};
                var prefetch_fields_ids = {};
                var promise = new $.Deferred();

                //отбираем prefetch поля
                for(var i in this.model.fields)
                {
                    if(this.model.fields[i].prefetch)
                    {
                        prefetch_fields[this.model.fields[i].name] = $.extend(true, {}, this.model.fields[i].prefetch);
                        prefetch_fields_ids[this.model.fields[i].name] = {};
                    }
                }

                //если prefetch полей не оказалось, то функция завершает свое выполнение
                if($.isEmptyObject(prefetch_fields))
                {
                    return promise.resolve(data);
                }

                var dataFromApi = data.data.results;

                //отбираем id prefetch полей
                for(var item in dataFromApi)
                {
                    for(var field in dataFromApi[item])
                    {
                        if(prefetch_fields[field])
                        {
                            if(!prefetch_fields_ids.hasOwnProperty(field))
                            {
                                prefetch_fields_ids[field] = {};
                            }

                            let path = prefetch_fields[field].path(dataFromApi[item]);

                            if(path)
                            {
                                if(!prefetch_fields_ids[field].hasOwnProperty(path))
                                {
                                    prefetch_fields_ids[field][path] = [];
                                }

                                if($.inArray(dataFromApi[item][field], prefetch_fields_ids[field][path]) == -1 && dataFromApi[item][field] != null )
                                {
                                    prefetch_fields_ids[field][path].push(dataFromApi[item][field]);
                                }
                            }
                        }
                    }
                }


                var bulkArr = [];
                var queryObj = {};

                //формируем bulk запрос
                for(var field in prefetch_fields_ids)
                {
                    for(var path in prefetch_fields_ids[field])
                    {

                        let match = path.match(/(?<parent_type>[A-z]+)\/(?<parent_id>[0-9]+)\/(?<page_type>[A-z\/]+)$/);
                        if(match != null)
                        {
                            queryObj = {
                                type: "mod",
                                item: match[1],
                                pk: match[2],
                                data_type: match[3],
                                method: "get",
                            }
                        }
                        else
                        {
                            let bulk_name = path.replace(/\{[A-z]+\}\/$/, "").toLowerCase().match(/\/([A-z0-9]+)\/$/);
                            queryObj = {
                                type: "mod",
                                item: bulk_name[1],
                                filters:"id="+prefetch_fields_ids[field][path].join(","),
                                method:"get",
                            }
                        }

                        bulkArr.push(queryObj);
                    }
                }

                //отправляем bulk запрос
                $.when(api.query(bulkArr)).done(d =>
                {
                    for(var item in dataFromApi)
                    {
                        for(var field in dataFromApi[item])
                        {
                            if(prefetch_fields[field])
                            {
                                let path = prefetch_fields[field].path(dataFromApi[item]);

                                if(path)
                                {
                                    let match = path.match(/(?<parent_type>[A-z]+)\/(?<parent_id>[0-9]+)\/(?<page_type>[A-z\/]+)$/);
                                    if(match != null)
                                    {
                                        for(var j in d)
                                        {
                                            if(d[j].item == match[1] && d[j].subitem == match[3])
                                            {
                                                let prefetch_data = d[j].data.results;
                                                for(var k in prefetch_data)
                                                {
                                                    if($.inArray(prefetch_data[k].id, prefetch_fields_ids[field][path]) != -1)
                                                    {
                                                        dataFromApi[item][field+'_info'] = prefetch_data[k];
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    else
                                    {
                                        let bulk_name = path.replace(/\{[A-z]+\}\/$/, "").toLowerCase().match(/\/([A-z0-9]+)\/$/);
                                        for(var j in d)
                                        {
                                            if(d[j].item == bulk_name[1])
                                            {
                                                let prefetch_data = d[j].data.results;
                                                for(var k in prefetch_data)
                                                {
                                                    if(dataFromApi[item][field] == prefetch_data[k].id)
                                                    {
                                                        dataFromApi[item][field+'_info'] = prefetch_data[k];
                                                    }
                                                }
                                            }
                                        }

                                    }
                                }
                            }
                        }
                    }

                    promise.resolve(data);
                }).fail(f => {
                    promise.reject(f);
                })

                return promise.promise();

            }

            /**
             * Функция загрузки данных
             * @returns {jQuery.ajax|spajs.ajax.Call.defpromise|type|spajs.ajax.Call.opt|spajs.ajax.Call.spaAnonym$10|Boolean|undefined|spajs.ajax.Call.spaAnonym$9}
             */
            this.load = function (filters)
            {
                if (!filters)
                {
                    filters = {};
                }

                if (!filters.limit)
                {
                    filters.limit = 20;
                }

                if (!filters.offset)
                {
                    filters.offset = 0;
                }

                if (!filters.ordering)
                {
                    filters.ordering = "desc";
                }

                if (filters.page_number)
                {
                    filters.offset = (filters.page_number-1)/1*filters.limit;
                }

                var q = [];

                q.push("limit=" + encodeURIComponent(filters.limit))
                q.push("offset=" + encodeURIComponent(filters.offset))
                q.push("ordering=" + encodeURIComponent(filters.ordering))

                if(filters.query)
                {
                    if(typeof filters.query == "string")
                    {
                        filters.query = this.searchStringToObject(filters.query)
                    }

                    for (var i in filters.query)
                    {
                        if (Array.isArray(filters.query[i]))
                        {
                            for (var j in filters.query[i])
                            {
                                filters.query[i][j] = encodeURIComponent(filters.query[i][j])
                            }
                            q.push(encodeURIComponent(i) + "=" + filters.query[i].join(","))
                            continue;
                        }
                        q.push(encodeURIComponent(i) + "=" + encodeURIComponent(filters.query[i]))
                    }
                }

                var queryObj = {}
                if(filters.parent_id && filters.parent_type)
                {
                    queryObj = {
                        type: "mod",
                        item: filters.parent_type,
                        filters:q.join("&"),
                        data_type:this.getBulkName(),
                        method:"get",
                        pk:filters.parent_id
                    }
                }
                else
                {
                    queryObj = {
                        type: "get",
                        item: this.getBulkName(),
                        filters:q.join("&")
                    }
                }

                var promise = new $.Deferred();

                $.when(api.query(queryObj)).done(d => {

                    $.when(this.prefetch(d)).always(a => {
                        promise.resolve(a);
                    });

                }).fail(f => {
                    promise.reject();
                })

                return promise.promise();
            }

            this.toggleSelectEachItem = function (tag, mode)
            {
                if(!mode)
                {
                    window.guiListSelections.unSelectAll(tag)
                    return false;
                }

                let filters = this.model.filters

                filters.limit = 9999999
                filters.offset = 0;
                filters.page_number = 0;

                return $.when(this.load(filters)).done(function(data)
                {
                    if(!data || !data.data || !data.data.results)
                    {
                        return;
                    }

                    let ids = []
                    for(let i in data.data.results)
                    {
                        ids.push(data.data.results[i].id)
                    }

                    window.guiListSelections.setSelection(tag, ids, mode);
                }).promise()
            }

            /**
             * Преобразует строку поиска в объект с параметрами для фильтрации
             * @param {string} query строка запроса
             * @param {string} defaultName имя параметра по умолчанию
             * @returns {pmItems.searchStringToObject.search} объект для поиска
             */
            this.searchStringToObject = function (query, defaultName)
            {
                var search = {}
                if (query == "")
                {
                    return search;
                }

                if (!defaultName)
                {
                    defaultName = 'name'
                }

                search[defaultName] = query;

                return search;
            }

            /**
             * Функция должна вернуть или html код блока или должа пообещать чтол вернёт html код блока позже
             * @returns {string|promise}
             */
            this.renderAsPage = function (render_options = {})
            {
                let tpl = this.getTemplateName('list')

                render_options.fields = this.getFields('renderAsPage')
                render_options.sections = this.getSections('renderAsPage')
                if(!render_options.page_type) render_options.page_type = 'list'

                return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
            }

            /**
             * Функция должна вернуть или html код блока или должа пообещать чтол вернёт html код блока позже
             * @returns {string|promise}
             */
            this.renderAsAddSubItemsPage = function (render_options = {})
            {
                let tpl = this.getTemplateName('list_add_subitems')

                render_options.fields = this.getFields('renderAsAddSubItemsPage')
                render_options.sections = this.getSections('renderAsAddSubItemsPage')

                return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
            }
            this.delete = function (){ }

            ////////////////////////////////////////////////
            // pagination
            ////////////////////////////////////////////////

            this.paginationHtml = function ()
            {
                var list = this.model.data

                // http://testserver/api/v2/host/?limit=20&offset=40&ordering=desc
                var limit = this.view.page_size;
                var offset = 0;

                if(this.model && this.model.data && this.model.data.previous)
                {
                    limit = this.model.data.previous.match(/limit=([0-9]+)/)
                    offset = this.model.data.previous.match(/offset=([0-9]+)/)
                    if(limit && limit[1])
                    {
                        if(offset && offset[1])
                        {
                            list.offset = offset[1]/1 + limit[1]/1
                        }
                        else
                        {
                            list.offset = limit[1]/1
                        }
                    }
                }
                else if(this.model && this.model.data && this.model.data.next)
                {
                    limit = this.model.data.next.match(/limit=([0-9]+)/)
                    offset = 0
                }

                if(limit && limit[1])
                {
                    limit = limit[1]/1
                }
                else
                {
                    limit = this.view.page_size
                }

                var totalPage = list.count / limit
                if (totalPage > Math.floor(totalPage))
                {
                    totalPage = Math.floor(totalPage) + 1
                }

                var currentPage = 0;
                if (list.offset)
                {
                    currentPage = Math.floor(list.offset / limit)
                }
                var url = window.location.href

                return  spajs.just.render('pagination', {
                    totalPage: totalPage,
                    currentPage: currentPage,
                    url: url})
            }

            this.getTotalPages = function ()
            {
                var limit = this.view.page_size

                if( this.model && this.model.data && this.model.data.previous )
                {
                    var limitLink = this.model.data.previous.match(/limit=([0-9]+)/)
                    if( limitLink && limitLink[1])
                    {
                        limit = limitLink[1]/1
                    }
                }
                if( this.model && this.model.data && this.model.data.next )
                {
                    var limitLink = this.model.data.next.match(/limit=([0-9]+)/)
                    if( limitLink && limitLink[1])
                    {
                        limit = limitLink[1]/1
                    }
                }

                return this.model.data.count / limit
            }

            var res = $.extend(this, basePageItem, thisFactory.list);

            res.parent = thisFactory
            /**
             * Перегрузить поля объекта создаваемого фабрикой можно таким образом
             *
             tabSignal.connect("gui.new.group.list", function(data)
             {
                 // Тут код который будет модифицировать создаваемый объект
                 data.model.fields = [
                     {
                         title:'Name',
                         name:'name',
                     },
                 ]
             })
             */
            tabSignal.emit("gui.new."+this.getBulkName()+".list", res);

            res.init(page_options, objects)

            return res;
        },

        /**
         * Преобразует строку и объект поиска в строку для урла страницы поиска
         * @param {string} query строка запроса
         * @param {string} defaultName имя параметра по умолчанию
         * @returns {string} строка для параметра страницы поиска
         */
        searchObjectToString:function (query, defaultName)
        {
            return encodeURIComponent(query);
        },

        /**
         * Если поисковый запрос пуст то вернёт true
         * @param {type} query
         * @returns {Boolean}
         */
        isEmptySearchQuery:function (query)
        {
            if (!query || !trim(query))
            {
                return true;
            }

            return false;
        }
    }

    /**
     * Представление полученное из апи
     *
     * Описание полей из апи
     */
    thisFactory.list.view = list.view

    /**
     * Представление полученное из апи
     */
    thisFactory.one.view = one.view

    thisFactory.view = both_view

    thisFactory.one = $.extend(thisFactory.one, guiBaseItemFactory)
    thisFactory.list = $.extend(thisFactory.list, guiBaseItemFactory)

    /**
     * Вернёт имя поля которое выполняет роль поля name у этого объекта
     * @returns {guiItemFactory.thisFactory.view.defaultName|String}
     */
    thisFactory.getObjectNameField = function()
    {
        if(this.view && this.view.defaultName)
        {
            return this.view.defaultName
        }

        if(this.list && this.list.view  && this.list.view.definition  && this.list.view.definition.properties)
        {
            if(this.one.view.definition.properties.name)
            {
                return "name"
            }
            if(this.one.view.definition.properties.username)
            {
                return "username"
            }
            if(this.one.view.definition.properties.key)
            {
                return "key"
            }
        }

        return "id";
    }

    return thisFactory;
}

/**
 * Класс работы с actions
 * @param {type} api
 * @param {type} action
 * @returns {guiActionFactory.thisFactory}
 */
function guiActionFactory(api, action)
{
    var parameters;
    if(action.action.post )
    {
        parameters = action.action.post.parameters
    }

    if(action.action.delete )
    {
        if(parameters)
        {
            debugger;
        }
        parameters = action.action.delete.parameters
    }

    if(action.action.put )
    {
        if(parameters)
        {
            debugger;
        }
        parameters = action.action.put.parameters
    }

    if(action.action.patch )
    {
        if(parameters)
        {
            debugger;
        }
        parameters = action.action.patch.parameters
    }

    var list_fields = []
    for(var i in parameters)
    {
        if($.inArray(i, ['url', 'id']) != -1)
        {
            continue;
        }

        var val = parameters[i]
        val.name = i


        list_fields.push(val)
    }


    var thisFactory = function(page_options){
        /**
         * @class guiApi
         */
        this.model = {}
        this.model.fields = list_fields
        this.model.guiFields = {}
        this.model.pathInfo = undefined

        this.init = function (page_options)
        {
            if(page_options)
            {
                this.model.pathInfo = page_options.api
                this.model.pageInfo = page_options.url

            }

            if(this.model.pathInfo)
            {
                // Список Actions строить будем на основе данных api
                this.model.sublinks = openApi_get_internal_links(this.api, this.model.pathInfo.api_path, 1);
            }
        }

        this.exec = function (callback, error_callback)
        {
            return this.sendToApi("PUT", callback, error_callback);
        }

        this.sendToApi = function (method, callback, error_callback)
        {
            var def = new $.Deferred();
            var data = {}

            try{
                data = this.getValue()
                if (this['onBefore'+method])
                {
                    data = this['onBefore'+method].apply(this, [data]);
                    if (data == undefined || data == false)
                    {
                        def.reject()
                        return def.promise();
                    }
                }

                /*let value = this.validateByModel(data)
                data = {}

                for(let i in value[0])
                {
                    if(value[0][i] && value[0][i] != "")
                    {
                        data[i] = value[0][i]
                    }
                }*/ 

                if(!this.model.pathInfo)
                {
                    console.error("pathInfo not define")
                    guiPopUp.error("Error in code: pathInfo not define");
                    def.reject()
                    return def.promise();
                }

                var query_method = ""
                var operationId = "";

                if(this.model.pathInfo.post && this.model.pathInfo.post.operationId)
                {
                    operationId = this.model.pathInfo.post.operationId
                    query_method = "post"
                }

                if(this.model.pathInfo.put && this.model.pathInfo.put.operationId)
                {
                    operationId = this.model.pathInfo.put.operationId
                    query_method = "put"
                }

                if(this.model.pathInfo.patch && this.model.pathInfo.patch.operationId)
                {
                    operationId = this.model.pathInfo.patch.operationId
                    query_method = "patch"
                }

                operationId = operationId.replace(/(set)_([A-z0-9]+)/g, "$1-$2")

                var operations = []
                operations = operationId.split("_");
                for(let i in operations)
                {
                    operations[i] = operations[i].replace("-", "_")
                }

                var query = []
                var url = this.model.pathInfo.api_path
                if(this.model.pageInfo)
                {
                    for(let i in this.model.pageInfo)
                    {
                        if(/^api_/.test(i))
                        {
                            url = url.replace("{"+i.replace("api_", "")+"}", this.model.pageInfo[i])
                        }
                    }

                    // Модификация на то если у нас мультиоперация
                    for(let i in this.model.pageInfo)
                    {
                        if(/^api_/.test(i))
                        {
                            if(this.model.pageInfo[i].indexOf(",") != -1)
                            {
                                let ids = this.model.pageInfo[i].split(",")
                                for(let j in ids)
                                {
                                    query.push(url.replace(this.model.pageInfo[i], ids[j]))
                                }

                                continue;
                            }
                        }
                    }
                }
                 
                if(query.length == 0)
                {
                    // Модификация на то если у нас не мультиоперация
                    query = [url]
                }

                query.forEach(qurl => {
                    
                    qurl = qurl.replace(/^\/|\/$/g, "").split(/\//g)
                    let q = {
                        type:'mod',
                        data_type:qurl,
                        data:data,
                        method:query_method
                    }
                    
                    $.when(api.query(q)).done(data => 
                    {
                        if(callback)
                        {
                            if(callback(data) === false)
                            {
                                return;
                            }
                        }
                        
                        if(data.not_found > 0)
                        {
                            guiPopUp.error("Item not found");
                            def.reject({text:"Item not found", status:404})
                            return;
                        }

                        guiPopUp.success("Save");
                        def.resolve()
                    }).fail(e => { 
                        if(callback)
                        {
                            if(error_callback(e) === false)
                            {
                                return;
                            }
                        }
                        
                        polemarch.showErrors(e.responseJSON)
                        def.reject(e)
                    }) 
                })

            }catch (e) {
                polemarch.showErrors(e)

                def.reject()
                if(e.error != 'validation')
                {
                    throw e
                }
            }

            return def.promise();
        }
 
        this.renderAsPage = function (render_options = {})
        {
            let tpl = this.getTemplateName('action_page_'+this.model.name, 'action_page')

            render_options.fields = this.getFields('renderAsPage')
            render_options.sections = this.getSections('renderAsPage')
            if(!render_options.page_type) render_options.page_type = 'action'

            return spajs.just.render(tpl, {query: "", guiObj: this, opt: render_options});
        }

        var res = $.extend(this, basePageItem, basePageView, thisFactory);

        res.init(page_options)
        return res;
    }

    thisFactory.api = api

    thisFactory.view = action
    thisFactory = $.extend(thisFactory, guiBaseItemFactory)

    return thisFactory;
}












































function emptyAction(action_info)
{
    let name = action_info.api_path.match(/\/([A-z0-9]+)\/$/); 
    if(!name || !name[1])
    {
        return undefined
    }
 
    let actionCalass = guiActionFactory(window.api, {action:action_info.api_path_value, api_path:action_info.api_path, name:name[1]})
    let action = new actionCalass({api:action_info.api_path_value, url:spajs.urlInfo.data.reg})
    
    return function(){
        action.exec() 
    }
}

/**
 * Выполняет переход на страницу с результатами поиска
 * Урл строит на основе того какая страница открыта.
 *
 * @param {string} query
 * @returns {$.Deferred}
 */
function goToSearch(obj, query)
{
    if (obj.isEmptySearchQuery(query))
    {
        spajs.openURL(spajs.urlInfo.data.reg.baseURL());
    }

    return spajs.openURL(spajs.urlInfo.data.reg.searchURL(obj.searchObjectToString(trim(query))));
}

function deleteAndGoUp(obj)
{
    var def = obj.delete();
    $.when(def).done(function(){
        var upper_url = spajs.urlInfo.data.reg.baseURL().replace(/\/\d+$/g, '');
        spajs.openURL(upper_url);
    })

    return def;
}

function createAndGoEdit(obj)
{
    var def = obj.create();
    $.when(def).done(function(newObj){

        spajs.openURL(spajs.urlInfo.data.reg.baseURL(newObj.data.id));
    })

    return def;
}

function goToMultiAction(ids, action)
{
    return spajs.openURL(window.hostname + "?" + spajs.urlInfo.data.reg.page_and_parents+"/"+ids.join(",")+"/"+action);
}

function goToMultiActionFromElements(elements, action)
{
    let ids = window.guiListSelections.getSelectionFromCurrentPage(elements);

    return goToMultiAction(ids, action)
}

function addToParentsAndGoUp(item_ids)
{
    return $.when(changeSubItemsInParent('POST', item_ids)).done(function (data)
    {
        spajs.openURL(window.hostname + spajs.urlInfo.data.reg.baseURL());
    }).fail(function (e)
    {
        polemarch.showErrors(e.responseJSON)
    }).promise();
}

/**
 * Для добавления и удаления подэлементов в списке
 * @param {array} item_ids
 * @returns {promise}
 */
function changeSubItemsInParent(action, item_ids)
{
    var def = new $.Deferred();
    if(!item_ids || item_ids.length == 0)
    {
        def.resolve()
        return def.promise();
    }

    let parent_id = spajs.urlInfo.data.reg.parent_id
    let parent_type = spajs.urlInfo.data.reg.parent_type
    let item_type = spajs.urlInfo.data.reg.page_type

    //var url = "/api/v2/" + parent_type +"/" + parent_id +"/" + item_type +"/"

    var parent = window["api"+parent_type]
    if(!parent)
    {
        console.error("Error parent object not found")
        debugger;
        def.resolve()
        return def.promise();
    }

    if(!parent_id)
    {
        console.error("Error parent_id not found")
        debugger;
        def.resolve()
        return def.promise();
    }

    var item = window["api"+item_type]
    if(!item)
    {
        console.error("Error item_type not found")
        debugger;
        def.resolve()
        return def.promise();
    }

    //  @todo отправка запроса чего то не работает. Надо сергея спросить.
    let query = []
    for(let i in item_ids)
    {
        query.push({
            type: "mod",
            data_type:item_type,
            item:parent_type,
            data:{id:item_ids[i]/1},
            pk:parent_id,
            method:action
        })
    }

    return api.query(query)

    /*
spajs.ajax.Call({
    url: url,
    type: "POST",
    contentType:'application/json',
    data:JSON.stringify(item_ids),
    success: function(data)
    {
        if(data.not_found > 0)
        {
            $.notify("Item not found", "error");
            def.reject({text:"Item not found", status:404})
            return;
        }

        $.notify("Save", "success");
        def.resolve()
    },
    error:function(e)
    {
        polemarch.showErrors(e.responseJSON)
        def.reject(e)
    }
});*/
    return def.promise();
}


function renderErrorAsPage(error)
{
    return spajs.just.render('error_as_page', {error:error, opt: {}});
}

function isEmptyObject(obj){
    return Object.keys(obj).length == 0
}

function questionForAllSelectedOrNot(selection_tag, action_name){
    var answer;
    var question = "Apply action <b>'"+ action_name + "'</b> for elements only from this page or for all selected elements?";
    var answer_buttons = ["For this page's selected", "For all selected"];
    $.when(guiPopUp.question(question, answer_buttons)).done(function(data){
        answer = data;
        if($.inArray(answer, answer_buttons) != -1)
        {
            if(answer == answer_buttons[0])
            {
                goToMultiActionFromElements($('.multiple-select .item-row.selected'), action_name );
            }
            else
            {
                goToMultiAction(selection_tag, action_name);
            }
        }
    });

    return false;
}

function questionDeleteAllSelectedOrNot(thisObj) {
    var answer;
    var question = "Apply action <b> 'delete' </b> for elements only from this page or for all selected elements?";
    var answer_buttons = ["For this page's selected", "For all selected"];

    $.when(guiPopUp.question(question, answer_buttons)).done(function(data){
        answer = data;
        if($.inArray(answer, answer_buttons) != -1)
        {
            let ids;
            let tag = thisObj.model.selectionTag;
            if(answer == answer_buttons[0])
            {
                ids = window.guiListSelections.getSelectionFromCurrentPage($('.multiple-select .item-row.selected'));
                deleteSelectedElements(thisObj, ids, tag);
            }
            else
            {
                ids = window.guiListSelections.getSelection(tag);
                deleteSelectedElements(thisObj, ids, tag);
            }
        }
    });

    return false;
}

function questionDeleteOrRemove(thisObj){
    var answer;
    var question = "<b> Delete </b> selected elements at all or just <b> remove </b> them from this list?";
    var answer_buttons = ["Delete this page's selected", "Delete all selected", "Remove this page's selected", "Remove all selected"];

    $.when(guiPopUp.question(question, answer_buttons)).done(function(data){
        answer = data;
        if($.inArray(answer, answer_buttons) != -1)
        {
            let ids;
            let tag = thisObj.model.selectionTag;
            switch(answer)
            {
                case answer_buttons[0]:
                    ids = window.guiListSelections.getSelectionFromCurrentPage($('.multiple-select .item-row.selected'));
                    deleteSelectedElements(thisObj, ids, tag);
                    break;
                case answer_buttons[1]:
                    ids = window.guiListSelections.getSelection(tag);
                    deleteSelectedElements(thisObj, ids, tag);
                    break;
                case answer_buttons[2]:
                    ids = window.guiListSelections.getSelectionFromCurrentPage($('.multiple-select .item-row.selected'));
                    removeSelectedElements(ids, tag);
                    break;
                case answer_buttons[3]:
                    ids = window.guiListSelections.getSelection(tag);
                    removeSelectedElements(ids, tag);
                    break;
            }
        }
    });

    return false;
}

/**
 * Функция удаляет элементы, id которых перечислены в массиве ids
 * (могут быть как все выделенные элементы, так и только элементы с текущей страницы).
 */
function deleteSelectedElements(thisObj, ids, tag){
    window.guiListSelections.unSelectAll(tag);

    for(let i in ids)
    {
        $(".item-row.item-"+ids[i]).remove()
    }

    $.when(thisObj.deleteArray(ids)).done(function(d)
    {

    }).fail(function (e)
    {
        polemarch.showErrors(e.responseJSON)
        debugger;
    })

    return false;
}


/**
 * Функция убирает из списка (но не удаляет совсем) элементы, id которых перечислены в массиве ids
 * (могут быть как все выделенные элементы, так и только элементы с текущей страницы).
 */
function removeSelectedElements(ids, tag) {
    $.when(changeSubItemsInParent('DELETE', ids)).done(function()
    {
        window.guiListSelections.unSelectAll(tag);
        debugger;
        spajs.openURL(window.hostname + spajs.urlInfo.data.reg.page_and_parents);
    }).fail(function (e)
    {
        polemarch.showErrors(e.responseJSON)
        debugger;
    })

    return false;
}