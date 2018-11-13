
guiLocalSettings.setIfNotExists('guiApi.real_query_timeout', 100)


/**
 * Класс апи и запросов к нему
 * @returns {guiApi}
 */
function guiApi()
{
    var thisObj = this;
    this.load = function()
    {
        var def = new $.Deferred();
        spajs.ajax.Call({
            url: hostname + "/api/openapi/?format=openapi",
            type: "GET",
            contentType:'application/json',
            data: "",
            success: function(data)
            {
                thisObj.openapi = data
                def.resolve(data);
            },
            error: function (e){
                def.reject(e);
            }
        });
        return def.promise();
    }
    this.getFromCache = function ()
    {
        let def = new $.Deferred();
        let openApiFromCache = guiFilesCache.getFile('openapi');
        openApiFromCache.then(
            result => {
                thisObj.openapi = JSON.parse(result.data);
                def.resolve();
            },
            error => {
                $.when(thisObj.load()).done(data => {
                    guiFilesCache.setFile('openapi', JSON.stringify(data));
                    thisObj.openapi = data;
                    def.resolve();
                }).fail(e => {
                    def.reject(e);
                })
            }
        )

        return def.promise();
    }
    this.init = function()
    {
        if(guiFilesCache && guiFilesCache.noCache)
        {
            return this.load();
        }
        else
        {
            return this.getFromCache();
        }
    }

    var query_data = {}
    var reinit_query_data = function()
    {
        query_data = {
            timeOutId:undefined,
            data:[],
            def:undefined,
            promise:[]
        }
    }
    reinit_query_data()

    /**
     * Балк запрос к апи который в себе содержит накопленные с разных подсистем запросы
     * @returns {promise}
     */
    var real_query = function(query_data)
    {
        var this_query_data = mergeDeep({}, query_data)
        reinit_query_data()

        spajs.ajax.Call({
            url: thisObj.openapi.schemes[0]+"://"+thisObj.openapi.host + thisObj.openapi.basePath+"/_bulk/",
            type: "PUT",
            contentType:'application/json',
            data: JSON.stringify(this_query_data.data),
            success: function(data)
            {
                this_query_data.def.resolve(data);
            },
            error: function (error){
                this_query_data.def.reject(error);
            }
        });
        return this_query_data.def.promise();
    }

    this.addQuery = function(query_data, data, chunked)
    {
        if(chunked)
        {
            for(let i in query_data.data)
            {
                if(deepEqual(query_data.data[i], data))
                {
                    return i
                }
            }
        }

        query_data.data.push(data)
        return query_data.data.length - 1
    }
    /**
     * Примеры запросов
     * https://git.vstconsulting.net/vst/vst-utils/blob/master/vstutils/unittests.py#L337
     *
     * Пример как ссылаться на предыдущий результат
     * https://git.vstconsulting.net/vst/vst-utils/blob/master/vstutils/unittests.py#L383
     *
     * @param {Object} data для балк запроса
     * @returns {promise}
     */
    this.query = function(data, chunked)
    {
        if(!query_data.def)
        {
            query_data.def = new $.Deferred();
        }

        if(query_data.timeOutId)
        {
            clearTimeout(query_data.timeOutId)
        }

        let data_index = undefined

        if($.isArray(data))
        {
            data_index = []
            for(let i in data)
            {
                data_index.push(this.addQuery(query_data, data[i], chunked))
            }
        }
        else
        {
            data_index = this.addQuery(query_data, data, chunked)
        }

        var promise = new $.Deferred();

        query_data.timeOutId = setTimeout(real_query, guiLocalSettings.get('guiApi.real_query_timeout'), query_data)

        $.when(query_data.def).done(data => {

            var val;
            if($.isArray(data_index))
            {
                val = []
                for(var i in data_index)
                {
                    val.push(data[data_index[i]]);
                }
            }
            else
            {
                val = data[data_index];
            }

            if($.isArray(data_index))
            {
                let toReject = false;
                for(var i in val)
                {
                    if(!(val[i].status >= 200 && val[i].status < 400))
                    {
                        toReject = true;
                    }
                }

                if(toReject)
                {
                    promise.reject(val);
                }
                else
                {
                    promise.resolve(val);
                }

            }
            else
            {
                if(val.status >= 200 && val.status < 400)
                {
                    promise.resolve(val);
                }
                else
                {
                    promise.reject(val);
                }
            }


        }).fail(function(error)
        {
            promise.reject(error)
        })


        return promise.promise();
    }

    return this;
}
